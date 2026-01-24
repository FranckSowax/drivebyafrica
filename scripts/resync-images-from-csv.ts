/**
 * Re-sync all Chinese vehicle images from today's CSV
 * This script streams the CSV and updates images without modifying URLs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EXPORT_HOST = 'https://autobase-perez.auto-api.com';
const EXPORT_AUTH = 'Basic ZXdpbmc6aVQ2ZzFmVnFxR1JBSGVZa1BGdFU=';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resyncImages() {
  const today = new Date().toISOString().split('T')[0];
  console.log('=== Re-syncing Chinese vehicle images from CSV ===');
  console.log('Date:', today);

  // First, get all Chinese vehicle source_ids from database
  console.log('\nFetching Chinese vehicles from database...');
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, source_id')
    .eq('source', 'china');

  if (error) {
    console.error('Error fetching vehicles:', error);
    return;
  }

  console.log('Chinese vehicles in database:', vehicles.length);

  // Create a map of source_id -> id for quick lookup
  const vehicleMap = new Map<string, string>();
  for (const v of vehicles) {
    vehicleMap.set(v.source_id, v.id);
  }

  // Stream and process CSV
  console.log('\nStreaming active_offer.csv...');
  const csvUrl = `${EXPORT_HOST}/dongchedi/${today}/active_offer.csv`;

  const response = await fetch(csvUrl, {
    headers: { Authorization: EXPORT_AUTH },
  });

  if (!response.ok) {
    console.error('Failed to download CSV:', response.status);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let headersParsed = false;
  let innerIdIndex = -1;
  let imagesIndex = -1;
  let syncedAtIndex = -1;

  let totalLines = 0;
  let matchedInDb = 0;
  let updated = 0;
  let errors = 0;
  let validImages = 0;

  // Batch updates
  const updateBatch: { id: string; images: string[] }[] = [];
  const BATCH_SIZE = 100;

  async function flushBatch() {
    if (updateBatch.length === 0) return;

    const promises = updateBatch.map(async ({ id, images }) => {
      const { error } = await supabase
        .from('vehicles')
        .update({
          images: images,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        errors++;
        return false;
      }
      updated++;
      return true;
    });

    await Promise.all(promises);
    updateBatch.length = 0;
  }

  async function processLine(line: string) {
    if (!line.trim()) return;

    if (!headersParsed) {
      const headers = line.split('|').map((h) => h.trim());
      innerIdIndex = headers.indexOf('inner_id');
      imagesIndex = headers.indexOf('images');
      syncedAtIndex = headers.indexOf('synced_at');
      headersParsed = true;
      console.log(
        'Headers parsed: inner_id=' + innerIdIndex + ', images=' + imagesIndex
      );
      return;
    }

    totalLines++;

    const columns = line.split('|');
    const innerId = columns[innerIdIndex]?.trim();
    const syncedAt = columns[syncedAtIndex]?.trim();

    if (!innerId || !syncedAt) return;

    // Check if this vehicle is in our database
    const vehicleId = vehicleMap.get(innerId);
    if (!vehicleId) return;

    matchedInDb++;

    // Check if synced_at < 6 days
    const syncDate = new Date(syncedAt);
    const diffDays = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= 6) return;

    let imagesJson = columns[imagesIndex]?.trim() || '';
    imagesJson = imagesJson.replace(/^"|"$/g, '').replace(/""/g, '"');

    try {
      const images = JSON.parse(imagesJson);
      if (Array.isArray(images) && images.length > 0) {
        // Normalize URLs - fix encoding issues
        const normalizedImages = images.map((url: string) => {
          if (!url || typeof url !== 'string') return url;
          try {
            // First, handle double-encoding: %252B -> %2B
            let normalized = url.replace(/%25([0-9A-Fa-f]{2})/g, '%$1');
            // Encode literal + as %2B in query string
            const questionIndex = normalized.indexOf('?');
            if (questionIndex === -1) return normalized;
            const base = normalized.substring(0, questionIndex);
            const query = normalized.substring(questionIndex + 1);
            const fixedQuery = query.replace(/\+/g, '%2B');
            return base + '?' + fixedQuery;
          } catch {
            return url;
          }
        });

        validImages++;
        updateBatch.push({ id: vehicleId, images: normalizedImages });

        if (updateBatch.length >= BATCH_SIZE) {
          await flushBatch();

          if (updated % 200 === 0) {
            console.log(
              `Progress: Lines: ${totalLines}, Matched: ${matchedInDb}, Valid: ${validImages}, Updated: ${updated}`
            );
          }
        }
      }
    } catch {
      // Skip invalid JSON
    }
  }

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      if (buffer.trim()) {
        await processLine(buffer);
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      await processLine(line);
    }
  }

  // Final flush
  await flushBatch();

  console.log('\n=== Summary ===');
  console.log('Total CSV lines processed:', totalLines);
  console.log('Matched in database:', matchedInDb);
  console.log('Valid images found:', validImages);
  console.log('Updated:', updated);
  console.log('Errors:', errors);

  // Test a few images
  console.log('\n=== Testing random images ===');
  const { data: testVehicles } = await supabase
    .from('vehicles')
    .select('source_id, make, images')
    .eq('source', 'china')
    .limit(5);

  for (const v of testVehicles || []) {
    const url = v.images?.[0];
    if (!url) continue;

    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://www.dongchedi.com/',
        },
        signal: AbortSignal.timeout(5000),
      });
      console.log(`${v.source_id} (${v.make}): ${resp.status}`);
    } catch (e: any) {
      console.log(`${v.source_id}: Error - ${e.message}`);
    }
  }
}

resyncImages().catch(console.error);
