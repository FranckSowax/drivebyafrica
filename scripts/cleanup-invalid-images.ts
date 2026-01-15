/**
 * Cleanup script to remove vehicles with invalid (403) images
 * Run this after sync to ensure only vehicles with working images remain
 *
 * Usage: npx tsx scripts/cleanup-invalid-images.ts [--dry-run] [--batch-size=50]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const batchSizeArg = args.find(a => a.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 50;
const CONCURRENT_CHECKS = 10;

/**
 * Test if an image URL is accessible (returns 200)
 */
async function testImageUrl(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.dongchedi.com/',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test multiple URLs concurrently
 */
async function testBatch(
  vehicles: { id: string; source_id: string; images: string[] }[]
): Promise<{ valid: string[]; invalid: string[] }> {
  const results = await Promise.all(
    vehicles.map(async (v) => {
      const firstImage = v.images?.[0];
      const isValid = await testImageUrl(firstImage);
      return { id: v.id, source_id: v.source_id, isValid };
    })
  );

  return {
    valid: results.filter(r => r.isValid).map(r => r.source_id),
    invalid: results.filter(r => !r.isValid).map(r => r.id),
  };
}

async function cleanupInvalidImages() {
  console.log('=== Cleanup Invalid Images ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Concurrent checks: ${CONCURRENT_CHECKS}`);
  console.log('');

  // Get all Chinese vehicles
  console.log('Fetching Chinese vehicles...');
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, source_id, images')
    .eq('source', 'china');

  if (error) {
    console.error('Error fetching vehicles:', error);
    return;
  }

  console.log(`Total vehicles: ${vehicles.length}`);
  console.log('');

  const stats = {
    tested: 0,
    valid: 0,
    invalid: 0,
    deleted: 0,
    errors: 0,
  };

  const invalidIds: string[] = [];

  // Process in batches
  for (let i = 0; i < vehicles.length; i += CONCURRENT_CHECKS) {
    const batch = vehicles.slice(i, i + CONCURRENT_CHECKS);
    const results = await testBatch(batch);

    stats.tested += batch.length;
    stats.valid += results.valid.length;
    stats.invalid += results.invalid.length;
    invalidIds.push(...results.invalid);

    // Progress update every 100 vehicles
    if (stats.tested % 100 === 0 || stats.tested === vehicles.length) {
      const pct = Math.round((stats.tested / vehicles.length) * 100);
      console.log(
        `[${pct}%] Tested: ${stats.tested}, Valid: ${stats.valid}, Invalid: ${stats.invalid}`
      );
    }
  }

  console.log('');
  console.log('=== Test Results ===');
  console.log(`Total tested: ${stats.tested}`);
  console.log(`Valid images: ${stats.valid}`);
  console.log(`Invalid images: ${stats.invalid}`);
  console.log(`Invalid rate: ${Math.round((stats.invalid / stats.tested) * 100)}%`);

  if (invalidIds.length === 0) {
    console.log('\nNo invalid vehicles to remove.');
    return;
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would delete ${invalidIds.length} vehicles`);
    console.log('Run without --dry-run to actually delete.');
    return;
  }

  // Delete invalid vehicles in batches
  console.log(`\nDeleting ${invalidIds.length} vehicles with invalid images...`);

  for (let i = 0; i < invalidIds.length; i += BATCH_SIZE) {
    const batch = invalidIds.slice(i, i + BATCH_SIZE);

    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch: ${deleteError.message}`);
      stats.errors++;
    } else {
      stats.deleted += batch.length;
    }
  }

  console.log('');
  console.log('=== Final Summary ===');
  console.log(`Deleted: ${stats.deleted}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Remaining vehicles: ${stats.valid}`);
}

cleanupInvalidImages().catch(console.error);
