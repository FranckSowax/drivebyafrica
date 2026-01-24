/**
 * Script to download Dongchedi vehicle photos and store them in Supabase Storage
 *
 * This creates permanent URLs for photos that won't expire.
 *
 * Usage: npx tsx scripts/download-photos.ts [--limit=100] [--batch=10]
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = 'dongchedi-photos';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse command line args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const batchArg = args.find(a => a.startsWith('--batch='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1]) : 10;

interface PhotoRecord {
  sourceId: string;
  images: string[];
  syncedAt: string;
}

async function parseCSV(csvPath: string): Promise<Map<string, PhotoRecord>> {
  const photoMap = new Map<string, PhotoRecord>();

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found. Please download it first:');
    console.error(`curl -L 'https://autobase-perez.auto-api.com/dongchedi/2026-01-13/active_offer.csv' -H 'authorization: Basic ZXdpbmc6aVQ2ZzFmVnFxR1JBSGVZa1BGdFU=' -o ${csvPath}`);
    process.exit(1);
  }

  console.log('Parsing CSV file...');

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
      console.log(`  Parsed ${lineCount} lines...`);
    }

    const columns = line.split('|');
    const sourceId = columns[innerIdIndex]?.trim();
    let imagesJson = columns[imagesIndex]?.trim();
    const syncedAt = columns[syncedAtIndex]?.trim();

    if (!sourceId || !imagesJson || !syncedAt) continue;

    // Check if synced_at is less than 6 days old
    const syncDate = new Date(syncedAt);
    const now = new Date();
    const diffDays = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays >= 6) continue; // Skip expired links

    // Parse images JSON
    imagesJson = imagesJson.replace(/^"|"$/g, '');
    imagesJson = imagesJson.replace(/""/g, '"');

    try {
      const images = JSON.parse(imagesJson);
      if (Array.isArray(images) && images.length > 0) {
        photoMap.set(sourceId, {
          sourceId,
          images,
          syncedAt
        });
      }
    } catch {
      // Skip malformed JSON
    }
  }

  console.log(`Found ${photoMap.size} vehicles with valid photo links (${lineCount} total lines)`);
  return photoMap;
}

async function downloadAndUploadPhoto(
  sourceId: string,
  imageUrl: string,
  index: number
): Promise<string | null> {
  try {
    // Download image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DrivebyAfrica/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`  Failed to download ${sourceId}/${index}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    // Determine file extension
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';

    const fileName = `${sourceId}/${index}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`  Upload error ${sourceId}/${index}:`, uploadError.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error(`  Error processing ${sourceId}/${index}:`, (err as Error).message);
    return null;
  }
}

async function main() {
  console.log('=== Dongchedi Photo Download Script ===');
  console.log(`Limit: ${LIMIT} vehicles, Batch size: ${BATCH_SIZE}`);

  // Parse CSV
  const csvPath = '/tmp/active_offer.csv';
  const photoMap = await parseCSV(csvPath);

  // Get vehicles from database that need photos downloaded
  console.log('\nFetching vehicles from database...');

  const allVehicles: { source_id: string; images: string[] | null }[] = [];
  let offset = 0;
  const fetchBatchSize = 1000;

  while (true) {
    const { data: batch, error } = await supabase
      .from('vehicles')
      .select('source_id, images')
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

  console.log(`Found ${allVehicles.length} China vehicles in database`);

  // Filter vehicles that need photo download
  // A vehicle needs download if:
  // 1. It exists in the CSV (has valid photo links)
  // 2. Its current images are either null, empty, or contain expiring URLs
  const vehiclesToProcess: { sourceId: string; images: string[] }[] = [];

  for (const vehicle of allVehicles) {
    const csvRecord = photoMap.get(vehicle.source_id);
    if (!csvRecord) continue;

    // Check if current images are from Supabase (permanent) or Dongchedi (temporary)
    const currentImages = vehicle.images || [];
    const hasTemporaryUrls = currentImages.length === 0 ||
      currentImages.some((url: string) => url.includes('byteimg.com') || url.includes('x-expires'));

    if (hasTemporaryUrls) {
      vehiclesToProcess.push({
        sourceId: vehicle.source_id,
        images: csvRecord.images,
      });
    }
  }

  console.log(`${vehiclesToProcess.length} vehicles need photo download`);

  // Process limited number
  const toProcess = vehiclesToProcess.slice(0, LIMIT);
  console.log(`\nProcessing ${toProcess.length} vehicles...`);

  const stats = {
    processed: 0,
    photosDownloaded: 0,
    photosFailed: 0,
    vehiclesUpdated: 0,
    vehiclesFailed: 0,
  };

  // Process in batches
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (vehicle) => {
      stats.processed++;
      const permanentUrls: string[] = [];

      // Download each photo (limit to first 5 for speed)
      const photosToDownload = vehicle.images.slice(0, 5);

      for (let j = 0; j < photosToDownload.length; j++) {
        const url = await downloadAndUploadPhoto(vehicle.sourceId, photosToDownload[j], j);
        if (url) {
          permanentUrls.push(url);
          stats.photosDownloaded++;
        } else {
          stats.photosFailed++;
        }

        // Small delay between photos
        await new Promise(r => setTimeout(r, 100));
      }

      // Update vehicle in database with permanent URLs
      if (permanentUrls.length > 0) {
        const { error } = await supabase
          .from('vehicles')
          .update({
            images: permanentUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('source', 'china')
          .eq('source_id', vehicle.sourceId);

        if (error) {
          console.error(`  DB update error for ${vehicle.sourceId}:`, error.message);
          stats.vehiclesFailed++;
        } else {
          stats.vehiclesUpdated++;
        }
      }
    }));

    console.log(`Progress: ${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length} vehicles`);
  }

  console.log('\n=== Summary ===');
  console.log(`Vehicles processed: ${stats.processed}`);
  console.log(`Photos downloaded: ${stats.photosDownloaded}`);
  console.log(`Photos failed: ${stats.photosFailed}`);
  console.log(`Vehicles updated: ${stats.vehiclesUpdated}`);
  console.log(`Vehicles failed: ${stats.vehiclesFailed}`);
}

main().catch(console.error);
