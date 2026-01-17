/**
 * Dubicars CI Sync Script
 *
 * Syncs vehicles from dubicars.com (Dubai/UAE market) to Supabase.
 * Designed for GitHub Actions daily automation.
 *
 * Usage: npx tsx scripts/sync-dubicars-ci.ts [options]
 *
 * Options:
 *   --max-pages=N         Max pages to fetch (default: 2000 = ~40,000 vehicles)
 *   --remove-expired=bool Remove vehicles no longer in API (default: true)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Accept both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const API_BASE = 'https://api1.auto-api.com/api/v2/dubicars';
const API_KEY = process.env.DUBICARS_API_KEY || process.env.ENCAR_API_KEY || 'iT6g1fVqqGRAHeYkPFtU';
const AED_TO_USD = 0.27;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse args
const args = process.argv.slice(2);
const getArg = (name: string, defaultVal: string) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultVal;
};

const MAX_PAGES = parseInt(getArg('max-pages', '2000'));
const REMOVE_EXPIRED = getArg('remove-expired', 'true') === 'true';

// Transmission type mapping
const transmissionMap: Record<string, string> = {
  'Automatic': 'automatic',
  'Manual': 'manual',
  'CVT': 'cvt',
};

// Fuel type mapping
const fuelTypeMap: Record<string, string> = {
  'Petrol': 'petrol',
  'Diesel': 'diesel',
  'Electric': 'electric',
  'Hybrid': 'hybrid',
  'Plug-in Hybrid': 'hybrid',
  'LPG': 'lpg',
  'CNG': 'lpg',
  'Other': 'petrol',
};

// Body type mapping
const bodyTypeMap: Record<string, string> = {
  'SUV/Crossover': 'suv',
  'SUV': 'suv',
  'Crossover': 'suv',
  'Sedan': 'sedan',
  'Hatchback': 'hatchback',
  'Coupe': 'coupe',
  'Convertible': 'convertible',
  'Wagon': 'wagon',
  'Van': 'van',
  'Minivan': 'van',
  'Pick Up Truck': 'pickup',
  'Pickup': 'pickup',
  'Sports Car': 'coupe',
  'Luxury': 'sedan',
  'Other': 'other',
};

// Drive type mapping
const driveTypeMap: Record<string, string> = {
  'Front Wheel Drive': 'fwd',
  'Rear Wheel Drive': 'rwd',
  'All Wheel Drive': 'awd',
  '4WD': '4wd',
  'Four Wheel Drive': '4wd',
  'AWD': 'awd',
  'FWD': 'fwd',
  'RWD': 'rwd',
};

interface ApiOffer {
  id: number;
  inner_id: string;
  change_type: string;
  data: {
    inner_id: string;
    url: string;
    mark: string;
    model: string;
    configuration: string;
    year: string;
    price: string;
    km_age: string;
    color: string;
    engine_type: string;
    body_type: string;
    transmission_type: string;
    drive_type: string;
    displacement: string;
    images: string; // JSON string array
    city: string;
    seller_type: string;
    section: string;
  };
}

/**
 * Fetch a page of offers from the API
 */
async function fetchOffersPage(page: number): Promise<{ offers: ApiOffer[]; hasMore: boolean }> {
  const url = `${API_BASE}/offers?api_key=${API_KEY}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const offers = data.result || [];
  const nextPage = data.meta?.next_page;

  return {
    offers,
    hasMore: nextPage !== null && nextPage !== undefined && offers.length > 0,
  };
}

/**
 * Parse images from JSON string
 */
function parseImages(imagesStr: string | undefined): string[] {
  if (!imagesStr) return [];
  try {
    const parsed = JSON.parse(imagesStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Get existing Dubai vehicles from database
 */
async function getExistingVehicles(): Promise<Set<string>> {
  const sourceIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from('vehicles')
      .select('source_id')
      .eq('source', 'dubai')
      .eq('auction_platform', 'dubicars')
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    data.forEach(v => sourceIds.add(v.source_id));
    offset += 1000;
    if (data.length < 1000) break;
  }

  return sourceIds;
}

/**
 * Map vehicle data to database format
 */
function mapToDbRecord(offer: ApiOffer) {
  const v = offer.data;
  const sourceId = `dubicars_${v.inner_id}`;
  const images = parseImages(v.images);

  // Parse price (AED to USD)
  let priceUsd: number | null = null;
  if (v.price && v.price !== '-1') {
    const priceAed = parseFloat(v.price);
    if (!isNaN(priceAed) && priceAed > 0) {
      priceUsd = Math.round(priceAed * AED_TO_USD);
    }
  }

  // Parse year
  const year = parseInt(v.year) || null;

  // Parse mileage
  const mileage = parseInt(v.km_age) || null;

  // Parse displacement
  let engineCc: number | null = null;
  if (v.displacement) {
    const displacement = parseFloat(v.displacement);
    if (!isNaN(displacement)) {
      // If displacement is in liters (e.g., 2.0), convert to cc
      engineCc = displacement < 100 ? Math.round(displacement * 1000) : Math.round(displacement);
    }
  }

  return {
    source: 'dubai',
    source_id: sourceId,
    source_url: v.url,
    make: v.mark,
    model: v.model,
    grade: v.configuration || null,
    year,
    mileage,
    engine_cc: engineCc,
    fuel_type: fuelTypeMap[v.engine_type] || 'petrol',
    transmission: transmissionMap[v.transmission_type] || 'automatic',
    drive_type: driveTypeMap[v.drive_type] || null,
    body_type: bodyTypeMap[v.body_type] || 'other',
    color: v.color || null,
    start_price_usd: priceUsd,
    current_price_usd: priceUsd,
    auction_status: 'ongoing',
    auction_platform: 'dubicars',
    images,
  };
}

async function main() {
  const startTime = Date.now();
  console.log('=== Dubicars CI Sync ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Options: max-pages=${MAX_PAGES}, remove-expired=${REMOVE_EXPIRED}`);

  // Step 1: Get existing vehicles
  console.log('\n[1/4] Fetching existing Dubicars vehicles from database...');
  const existingVehicles = await getExistingVehicles();
  console.log(`  Found ${existingVehicles.size} existing Dubicars vehicles`);

  // Step 2: Fetch from API
  console.log('\n[2/4] Fetching vehicles from API...');
  const allVehicles: ApiOffer[] = [];
  const seenIds = new Set<string>();
  let page = 1;
  let emptyPages = 0;

  while (page <= MAX_PAGES) {
    try {
      const { offers, hasMore } = await fetchOffersPage(page);

      if (offers.length === 0) {
        emptyPages++;
        if (emptyPages >= 3) {
          console.log(`  Stopping after ${emptyPages} empty pages at page ${page}`);
          break;
        }
      } else {
        emptyPages = 0;
      }

      for (const offer of offers) {
        const innerId = offer.data?.inner_id || offer.inner_id;
        if (innerId && !seenIds.has(innerId)) {
          seenIds.add(innerId);
          allVehicles.push(offer);
        }
      }

      if (page % 100 === 0) {
        console.log(`  Page ${page}: ${allVehicles.length} unique offers`);
      }

      if (!hasMore) {
        console.log(`  Reached end at page ${page}`);
        break;
      }

      page++;
      // Rate limiting - 100ms between requests
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`  Error at page ${page}:`, (e as Error).message);
      // Continue to next page on error
      page++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`  Total vehicles to sync: ${allVehicles.length}`);

  // Step 3: Upsert vehicles
  console.log('\n[3/4] Upserting vehicles to database...');

  const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };
  const batchSize = 100;
  const currentSourceIds = new Set<string>();

  for (let i = 0; i < allVehicles.length; i += batchSize) {
    const batch = allVehicles.slice(i, i + batchSize);
    const records = batch
      .map(v => {
        try {
          const record = mapToDbRecord(v);
          // Skip vehicles without images
          if (!record.images || record.images.length === 0) {
            stats.skipped++;
            return null;
          }
          currentSourceIds.add(record.source_id);
          return record;
        } catch (e) {
          stats.errors++;
          return null;
        }
      })
      .filter(Boolean);

    if (records.length === 0) continue;

    const { error, data } = await supabase
      .from('vehicles')
      .upsert(records, {
        onConflict: 'source,source_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(`  Batch error at ${i}:`, error.message);
      stats.errors += records.length;
    } else {
      // Count added vs updated
      for (const record of records) {
        if (record && existingVehicles.has(record.source_id)) {
          stats.updated++;
        } else {
          stats.added++;
        }
      }
    }

    if ((i + batchSize) % 1000 === 0) {
      console.log(`  Processed ${i + batchSize}/${allVehicles.length}`);
    }
  }

  console.log(`  Added: ${stats.added}, Updated: ${stats.updated}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`);

  // Step 4: Remove expired/sold vehicles
  let removed = 0;
  if (REMOVE_EXPIRED) {
    console.log('\n[4/4] Removing expired/sold vehicles...');

    // Find vehicles in DB that are not in current sync
    const staleIds: string[] = [];
    for (const existingId of existingVehicles) {
      if (!currentSourceIds.has(existingId)) {
        staleIds.push(existingId);
      }
    }

    console.log(`  Found ${staleIds.length} stale vehicles to remove`);

    // Delete in batches - ONLY Dubicars vehicles
    for (let i = 0; i < staleIds.length; i += 100) {
      const batch = staleIds.slice(i, i + 100);
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('source', 'dubai')
        .eq('auction_platform', 'dubicars')
        .in('source_id', batch);

      if (!error) {
        removed += batch.length;
      } else {
        console.error(`  Error removing batch:`, error.message);
      }
    }

    console.log(`  Removed ${removed} vehicles`);
  }

  // Update sync config
  console.log('\n[5/5] Updating sync configuration...');
  await supabase.from('sync_config').upsert({
    source: 'dubicars',
    last_sync_at: new Date().toISOString(),
    last_sync_status: 'success',
    total_vehicles: stats.added + stats.updated,
    vehicles_added: stats.added,
    vehicles_updated: stats.updated,
    vehicles_removed: removed,
  }, {
    onConflict: 'source',
  });

  // Summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n=== Summary ===');
  console.log(`Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log(`Total vehicles processed: ${allVehicles.length}`);
  console.log(`Added: ${stats.added}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Removed: ${removed}`);
  console.log(`Skipped (no images): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  // Output for GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `
## Dubicars Sync Results

| Metric | Value |
|--------|-------|
| Duration | ${Math.floor(duration / 60)}m ${duration % 60}s |
| Vehicles Processed | ${allVehicles.length} |
| Added | ${stats.added} |
| Updated | ${stats.updated} |
| Removed | ${removed} |
| Skipped | ${stats.skipped} |
| Errors | ${stats.errors} |
`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
