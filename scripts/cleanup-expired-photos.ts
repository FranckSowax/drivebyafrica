/**
 * Script to remove vehicles with expired photo URLs
 * Keeps only vehicles with:
 * - Valid (non-expired) photo URLs
 * - Permanent Supabase Storage URLs
 *
 * Usage: npx tsx scripts/cleanup-expired-photos.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function isPhotoValid(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false;

  // Supabase URLs are always valid (permanent)
  if (imageUrl.includes('supabase')) return true;

  // Check x-expires timestamp
  const expiresMatch = imageUrl.match(/x-expires=(\d+)/);
  if (expiresMatch) {
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
    return expiresTimestamp > Date.now();
  }

  // URLs without x-expires are considered invalid
  return false;
}

async function main() {
  console.log('=== Cleanup Expired Photo Vehicles ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletions)' : 'LIVE (will delete)'}\n`);

  // Fetch all China vehicles
  console.log('Fetching all China vehicles...');
  const toDelete: string[] = [];
  const toKeep: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('source_id, images')
      .eq('source', 'china')
      .range(offset, offset + 999);

    if (error) {
      console.error('Database error:', error);
      break;
    }

    if (!data || data.length === 0) break;

    for (const vehicle of data) {
      const firstImage = vehicle.images?.[0];
      if (isPhotoValid(firstImage)) {
        toKeep.push(vehicle.source_id);
      } else {
        toDelete.push(vehicle.source_id);
      }
    }

    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log(`\nAnalysis complete:`);
  console.log(`  Vehicles to KEEP (valid photos): ${toKeep.length}`);
  console.log(`  Vehicles to DELETE (expired photos): ${toDelete.length}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No vehicles deleted. Run without --dry-run to delete.');
    return;
  }

  // Delete vehicles with expired photos
  console.log(`\nDeleting ${toDelete.length} vehicles with expired photos...`);

  let deleted = 0;
  const batchSize = 100;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('source', 'china')
      .in('source_id', batch);

    if (error) {
      console.error(`  Batch delete error:`, error.message);
    } else {
      deleted += batch.length;
    }

    if ((i + batchSize) % 5000 === 0 || i + batchSize >= toDelete.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, toDelete.length)}/${toDelete.length} deleted`);
    }
  }

  // Verify final count
  const { count: finalCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'china');

  console.log(`\n=== Summary ===`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Remaining China vehicles: ${finalCount}`);
}

main().catch(console.error);
