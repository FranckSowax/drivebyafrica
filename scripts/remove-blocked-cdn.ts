/**
 * Remove vehicles with images from blocked CDN servers (p3, p6)
 * These servers return 403 from most regions outside China
 *
 * Usage: npx tsx scripts/remove-blocked-cdn.ts [--dry-run]
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

// CDN servers that are blocked from our region
const BLOCKED_CDN_PATTERNS = [
  'p3-dcd-sign.byteimg.com',
  'p6-dcd-sign.byteimg.com',
  'p1-dcd-sign.byteimg.com',
];

const DRY_RUN = process.argv.includes('--dry-run');

async function removeBlockedCdn() {
  console.log('=== Remove Vehicles with Blocked CDN Images ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Blocked patterns: ${BLOCKED_CDN_PATTERNS.join(', ')}`);
  console.log('');

  // Get all Chinese vehicles
  console.log('Fetching Chinese vehicles...');
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, source_id, images')
    .eq('source', 'china');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total vehicles: ${vehicles.length}`);

  // Find vehicles with blocked CDN
  const toRemove: string[] = [];
  const byServer: Record<string, number> = {};

  for (const v of vehicles) {
    const firstImage = v.images?.[0] || '';

    // Check which server
    const serverMatch = firstImage.match(/(p\d+)-dcd-sign\.byteimg\.com/);
    const server = serverMatch ? serverMatch[1] : 'unknown';
    byServer[server] = (byServer[server] || 0) + 1;

    // Check if blocked
    const isBlocked = BLOCKED_CDN_PATTERNS.some(pattern => firstImage.includes(pattern));
    if (isBlocked) {
      toRemove.push(v.id);
    }
  }

  console.log('');
  console.log('=== Distribution by CDN Server ===');
  for (const [server, count] of Object.entries(byServer).sort((a, b) => b[1] - a[1])) {
    const blocked = BLOCKED_CDN_PATTERNS.some(p => p.includes(server));
    console.log(`  ${server}: ${count} vehicles ${blocked ? '(BLOCKED)' : '(OK)'}`);
  }

  console.log('');
  console.log(`Vehicles with blocked CDN: ${toRemove.length}`);
  console.log(`Vehicles to keep: ${vehicles.length - toRemove.length}`);

  if (toRemove.length === 0) {
    console.log('\nNo vehicles to remove.');
    return;
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would delete ${toRemove.length} vehicles`);
    return;
  }

  // Delete in batches
  console.log(`\nDeleting ${toRemove.length} vehicles...`);
  let deleted = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < toRemove.length; i += BATCH_SIZE) {
    const batch = toRemove.slice(i, i + BATCH_SIZE);
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .in('id', batch);

    if (!deleteError) {
      deleted += batch.length;
    }
  }

  console.log(`\nDeleted: ${deleted} vehicles`);
  console.log(`Remaining: ${vehicles.length - deleted} vehicles`);
}

removeBlockedCdn().catch(console.error);
