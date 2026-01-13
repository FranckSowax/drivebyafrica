/**
 * Script to update Dongchedi vehicle photo URLs from CSV export
 *
 * Usage: npx tsx scripts/update-photo-urls.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper to format array for PostgreSQL TEXT[] column
function formatPgArray(arr: string[]): string {
  if (!arr || arr.length === 0) return '{}';
  const escaped = arr.map((s) => {
    if (typeof s !== 'string') return '""';
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  });
  return `{${escaped.join(',')}}`;
}

import * as readline from 'readline';

async function main() {
  console.log('Starting photo URL update...');

  // Read CSV file using streaming
  const csvPath = '/tmp/active_offer.csv';
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found. Please download it first:');
    console.error(`curl -L 'https://autobase-perez.auto-api.com/dongchedi/2026-01-13/active_offer.csv' -H 'authorization: Basic ZXdpbmc6aVQ2ZzFmVnFxR1JBSGVZa1BGdFU=' -o ${csvPath}`);
    process.exit(1);
  }

  // Build a map of source_id -> images using streaming
  const photoMap = new Map<string, string[]>();

  console.log('Parsing CSV file (streaming)...');

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let innerIdIndex = -1;
  let imagesIndex = -1;
  let syncedAtIndex = -1;
  let lineCount = 0;
  let validCount = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      const header = line.split('|');
      innerIdIndex = header.indexOf('inner_id');
      imagesIndex = header.indexOf('images');
      syncedAtIndex = header.indexOf('synced_at');
      isFirstLine = false;
      continue;
    }

    lineCount++;
    if (lineCount % 50000 === 0) {
      console.log(`  Parsed ${lineCount} lines, valid: ${validCount}...`);
    }

    const columns = line.split('|');
    const sourceId = columns[innerIdIndex]?.trim();
    const syncedAt = columns[syncedAtIndex]?.trim();
    let imagesJson = columns[imagesIndex]?.trim();

    if (!sourceId || !imagesJson) continue;

    // Check if synced_at < 6 days (photos expire after 6 days)
    if (syncedAt) {
      const syncDate = new Date(syncedAt);
      const diffDays = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 6) continue; // Skip expired photos
    }

    // Parse images JSON - handle escaped quotes
    // CSV format: "[""url1"", ""url2""]" -> need to convert "" to "
    imagesJson = imagesJson.replace(/^"|"$/g, ''); // Remove outer quotes
    imagesJson = imagesJson.replace(/""/g, '"');   // Convert "" to "

    try {
      const images = JSON.parse(imagesJson);
      if (Array.isArray(images) && images.length > 0) {
        photoMap.set(sourceId, images);
        validCount++;
      }
    } catch (e) {
      // Skip malformed JSON - log first few errors
      if (photoMap.size === 0 && lineCount < 5) {
        console.log(`  Parse error for ${sourceId}: ${(e as Error).message}`);
        console.log(`  JSON: ${imagesJson.substring(0, 100)}...`);
      }
    }
  }

  console.log(`Parsed ${photoMap.size} photo records from CSV (${lineCount} lines)`);

  // Get all China vehicle source_ids from our database
  console.log('Fetching China vehicles from database...');

  // Fetch in batches to avoid the 1000 row default limit
  const allVehicles: { source_id: string }[] = [];
  let offset = 0;
  const fetchBatchSize = 1000;

  while (true) {
    const { data: batch, error } = await supabase
      .from('vehicles')
      .select('source_id')
      .eq('source', 'china')
      .range(offset, offset + fetchBatchSize - 1);

    if (error) {
      console.error('Database error:', error);
      process.exit(1);
    }

    if (!batch || batch.length === 0) break;

    allVehicles.push(...batch);
    offset += fetchBatchSize;

    if (batch.length < fetchBatchSize) break;
  }

  const vehicles = allVehicles;

  console.log(`Found ${vehicles?.length || 0} China vehicles in database`);

  // Match and update
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  const vehicleSourceIds = vehicles?.map(v => v.source_id) || [];
  const batchSize = 50;

  for (let i = 0; i < vehicleSourceIds.length; i += batchSize) {
    const batch = vehicleSourceIds.slice(i, i + batchSize);

    const updatePromises = batch.map(async (sourceId) => {
      const images = photoMap.get(sourceId);
      if (!images) {
        return { notFound: true };
      }

      const { error: updateError } = await supabase
        .from('vehicles')
        .update({
          images: formatPgArray(images) as unknown as string[],
          updated_at: new Date().toISOString(),
        })
        .eq('source', 'china')
        .eq('source_id', sourceId);

      if (updateError) {
        return { error: true };
      }
      return { updated: true };
    });

    const results = await Promise.all(updatePromises);

    for (const result of results) {
      if ('notFound' in result) notFound++;
      else if ('error' in result) errors++;
      else if ('updated' in result) updated++;
    }

    console.log(`Progress: ${i + batch.length}/${vehicleSourceIds.length} - Updated: ${updated}, Not found: ${notFound}, Errors: ${errors}`);
  }

  console.log('\n=== Summary ===');
  console.log(`Total vehicles: ${vehicleSourceIds.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found in CSV: ${notFound}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
