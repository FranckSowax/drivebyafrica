/**
 * CHE168 CI Sync Script
 *
 * Syncs vehicles from che168.com (Chinese market) to Supabase.
 * Designed for GitHub Actions daily automation.
 *
 * Usage: npx tsx scripts/sync-che168-ci.ts [options]
 *
 * Options:
 *   --max-pages=N         Max pages to fetch (default: 500 = ~10,000 vehicles)
 *   --use-csv=bool        Use CSV export for faster sync (default: true)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

// Accept both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const API_BASE = 'https://api1.auto-api.com/api/v2/che168';
const API_KEY = process.env.CHE168_API_KEY || process.env.ENCAR_API_KEY || 'iT6g1fVqqGRAHeYkPFtU';
const CNY_TO_USD = 0.138;

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

const MAX_PAGES = parseInt(getArg('max-pages', '500'));
const USE_CSV = getArg('use-csv', 'true') === 'true';
const REMOVE_EXPIRED = getArg('remove-expired', 'true') === 'true';

// Transmission type mapping
const transmissionMap: Record<string, string> = {
  'Automatic': 'automatic',
  'Manual': 'manual',
};

// Fuel type mapping
const fuelTypeMap: Record<string, string> = {
  'Gasoline': 'petrol',
  'Diesel': 'diesel',
  'Electric': 'electric',
  'Hybrid': 'hybrid',
  'Plug-in Hybrid': 'hybrid',
  'Range Extender': 'electric',
  'Hydrogen Fuel Cell': 'electric',
  'Gasoline + 48V Mild Hybrid': 'hybrid',
  'Gasoline + 24V Mild Hybrid': 'hybrid',
  'Gasoline + CNG': 'lpg',
  'CNG': 'lpg',
  'Other': 'petrol',
};

// Body type mapping
const bodyTypeMap: Record<string, string> = {
  'Crossover/SUV': 'suv',
  'SUV': 'suv',
  'Sedan': 'sedan',
  'Hatchback': 'hatchback',
  'Minivan': 'minivan',
  'Pickup': 'pickup',
  'Coupe/Roadster': 'coupe',
  'Sports Car': 'coupe',
  'Microvan': 'van',
  'Van': 'van',
  'Light Truck': 'pickup',
  'Mini': 'hatchback',
  'Other': 'other',
};

// Drive type mapping
const driveTypeMap: Record<string, string> = {
  'FWD': 'fwd',
  'RWD': 'rwd',
  'AWD': 'awd',
  'RWD (dual-motor)': 'rwd',
  'AWD (dual-motor)': 'awd',
  'AWD (tri-motor)': 'awd',
  'AWD (quad-motor)': 'awd',
  'RWD (mid-engine)': 'rwd',
  'Other': 'fwd',
};

interface ApiOffer {
  inner_id: string;
  url: string;
  mark: string;
  model: string;
  title: string;
  year: number;
  price: number;
  km_age: number;
  engine_type: string;
  transmission_type: string;
  body_type: string;
  drive_type: string;
  color: string;
  displacement?: number;
  images: string[];
}

interface CsvVehicle {
  inner_id: string;
  url: string;
  mark: string;
  model: string;
  title: string;
  year: number;
  price: number;
  km_age: number;
  engine_type: string;
  transmission_type: string;
  body_type: string;
  drive_type: string;
  color: string;
  displacement: number;
  images: string[];
}

/**
 * Convert displacement from liters to cc
 */
function convertDisplacementToCC(displacement: number | string | undefined): number | null {
  if (!displacement) return null;
  const liters = typeof displacement === 'string' ? parseFloat(displacement) : displacement;
  if (isNaN(liters) || liters <= 0) return null;
  return Math.round(liters * 1000);
}

/**
 * Fetch offers from API
 */
async function fetchOffersPage(page: number): Promise<{ offers: ApiOffer[]; hasMore: boolean }> {
  const url = `${API_BASE}/offers?api_key=${API_KEY}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const offers: ApiOffer[] = [];

  for (const item of data.result || []) {
    if (item.change_type === 'added' && item.data?.url) {
      const d = item.data;
      let images: string[] = [];

      if (d.images) {
        if (typeof d.images === 'string') {
          try {
            images = JSON.parse(d.images);
          } catch {
            images = [];
          }
        } else if (Array.isArray(d.images)) {
          images = d.images;
        }
      }

      offers.push({
        inner_id: String(d.inner_id),
        url: d.url,
        mark: d.mark,
        model: d.model,
        title: d.title || '',
        year: parseInt(d.year) || 0,
        price: parseFloat(d.price) || 0,
        km_age: parseInt(d.km_age) || 0,
        engine_type: d.engine_type || '',
        transmission_type: d.transmission_type || '',
        body_type: d.body_type || '',
        drive_type: d.drive_type || '',
        color: d.color || '',
        displacement: d.displacement,
        images,
      });
    }
  }

  return {
    offers,
    hasMore: data.meta?.next_page !== null,
  };
}

/**
 * Load vehicles from CSV export
 */
async function loadVehiclesFromCsv(): Promise<CsvVehicle[]> {
  const csvPath = '/tmp/che168_active.csv';
  const vehicles: CsvVehicle[] = [];

  if (!fs.existsSync(csvPath)) {
    console.log('  No CSV found at /tmp/che168_active.csv');
    return vehicles;
  }

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isFirst = true;
  let headers: string[] = [];
  let lineCount = 0;

  for await (const line of rl) {
    if (isFirst) {
      headers = line.split('|');
      isFirst = false;
      continue;
    }

    lineCount++;
    const cols = line.split('|');

    const getCol = (name: string) => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? cols[idx]?.trim() || '' : '';
    };

    const innerId = getCol('inner_id');
    if (!innerId) continue;

    let images: string[] = [];
    const imagesJson = getCol('images').replace(/^"|"$/g, '').replace(/""/g, '"');
    try {
      images = JSON.parse(imagesJson);
    } catch {
      images = [];
    }

    if (images.length === 0) continue;

    vehicles.push({
      inner_id: innerId,
      url: getCol('url'),
      mark: getCol('mark'),
      model: getCol('model'),
      title: getCol('title'),
      year: parseInt(getCol('year')) || 0,
      price: parseFloat(getCol('price')) || 0,
      km_age: parseInt(getCol('km_age')) || 0,
      engine_type: getCol('engine_type'),
      transmission_type: getCol('transmission_type'),
      body_type: getCol('body_type'),
      drive_type: getCol('drive_type'),
      color: getCol('color'),
      displacement: parseFloat(getCol('displacement')) || 0,
      images,
    });
  }

  console.log(`  Loaded ${vehicles.length} vehicles from CSV (${lineCount} total lines)`);
  return vehicles;
}

/**
 * Get existing China vehicles from database
 */
async function getExistingVehicles(): Promise<Set<string>> {
  const sourceIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from('vehicles')
      .select('source_id')
      .eq('source', 'china')
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    data.forEach(v => sourceIds.add(v.source_id));
    offset += 1000;
    if (data.length < 1000) break;
  }

  return sourceIds;
}

/**
 * Load removed vehicle IDs from CSV export (removed_daily.csv)
 */
async function loadRemovedFromCsv(): Promise<Set<string>> {
  const csvPath = '/tmp/che168_removed.csv';
  const removedIds = new Set<string>();

  if (!fs.existsSync(csvPath)) {
    console.log('  No removed CSV found at /tmp/che168_removed.csv');
    return removedIds;
  }

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isFirst = true;
  let headers: string[] = [];
  let lineCount = 0;

  for await (const line of rl) {
    if (isFirst) {
      headers = line.split('|');
      isFirst = false;
      continue;
    }

    lineCount++;
    const cols = line.split('|');
    const innerIdIdx = headers.indexOf('inner_id');
    const innerId = innerIdIdx >= 0 ? cols[innerIdIdx]?.trim() : '';

    if (innerId) {
      removedIds.add(innerId);
    }
  }

  console.log(`  Loaded ${removedIds.size} removed vehicle IDs from CSV (${lineCount} lines)`);
  return removedIds;
}

/**
 * Map vehicle data to database format
 */
function mapToDbRecord(vehicle: ApiOffer | CsvVehicle) {
  const sourceId = vehicle.inner_id;
  const priceUsd = Math.round(vehicle.price * CNY_TO_USD);
  const engineCc = convertDisplacementToCC(vehicle.displacement);

  return {
    source: 'china',
    source_id: sourceId,
    source_url: vehicle.url,
    make: vehicle.mark,
    model: vehicle.model,
    grade: vehicle.title,
    year: vehicle.year,
    mileage: vehicle.km_age,
    engine_cc: engineCc,
    fuel_type: fuelTypeMap[vehicle.engine_type] || 'petrol',
    transmission: transmissionMap[vehicle.transmission_type] || 'automatic',
    drive_type: driveTypeMap[vehicle.drive_type] || null,
    body_type: bodyTypeMap[vehicle.body_type] || 'other',
    color: vehicle.color,
    start_price_usd: priceUsd,
    current_price_usd: priceUsd,
    auction_status: 'ongoing',
    auction_platform: 'che168',
    images: vehicle.images,
  };
}

async function main() {
  const startTime = Date.now();
  console.log('=== CHE168 CI Sync ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Options: max-pages=${MAX_PAGES}, use-csv=${USE_CSV}, remove-expired=${REMOVE_EXPIRED}`);

  // Step 1: Get existing vehicles
  console.log('\n[1/4] Fetching existing CHE168 vehicles from database...');
  const existingVehicles = await getExistingVehicles();
  console.log(`  Found ${existingVehicles.size} existing CHE168 vehicles`);

  // Step 2: Load data (CSV or API)
  let allVehicles: (ApiOffer | CsvVehicle)[] = [];

  if (USE_CSV) {
    console.log('\n[2/4] Loading vehicles from CSV export...');
    allVehicles = await loadVehiclesFromCsv();

    if (allVehicles.length === 0) {
      console.log('  CSV empty or not found, falling back to API...');
    }
  }

  if (allVehicles.length === 0) {
    console.log('\n[2/4] Fetching vehicles from API...');
    const seenIds = new Set<string>();
    let page = 1;

    while (page <= MAX_PAGES) {
      try {
        const { offers, hasMore } = await fetchOffersPage(page);

        for (const offer of offers) {
          if (!seenIds.has(offer.inner_id)) {
            seenIds.add(offer.inner_id);
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
        await new Promise(r => setTimeout(r, 100)); // Rate limiting
      } catch (e) {
        console.error(`  Error at page ${page}:`, (e as Error).message);
        break;
      }
    }
  }

  console.log(`  Total vehicles to sync: ${allVehicles.length}`);

  // Step 3: Upsert vehicles
  console.log('\n[3/4] Upserting vehicles to database...');

  const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };
  const batchSize = 100;

  for (let i = 0; i < allVehicles.length; i += batchSize) {
    const batch = allVehicles.slice(i, i + batchSize);

    const records = batch.map(vehicle => {
      // Skip if no images
      if (!vehicle.images || vehicle.images.length === 0) {
        stats.skipped++;
        return null;
      }
      return mapToDbRecord(vehicle);
    }).filter(Boolean);

    if (records.length === 0) continue;

    const { error } = await supabase.from('vehicles').upsert(records, {
      onConflict: 'source,source_id',
    });

    if (error) {
      console.error(`  Batch error:`, error.message);
      stats.errors++;
    } else {
      const newCount = records.filter(r => r && !existingVehicles.has(r.source_id)).length;
      const updateCount = records.length - newCount;
      stats.added += newCount;
      stats.updated += updateCount;
    }

    if ((i + batchSize) % 2000 === 0 || i + batchSize >= allVehicles.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, allVehicles.length)}/${allVehicles.length}`);
    }
  }

  // Step 4: Remove expired/sold vehicles
  let removed = 0;
  if (REMOVE_EXPIRED) {
    console.log('\n[4/5] Processing removed/expired vehicles...');

    // Load removed IDs from CSV
    const removedIds = await loadRemovedFromCsv();

    // Also find vehicles not in current sync (stale listings)
    const currentSourceIds = new Set(allVehicles.map(v => v.inner_id));
    const staleIds: string[] = [];

    for (const existingId of existingVehicles) {
      if (!currentSourceIds.has(existingId)) {
        staleIds.push(existingId);
      }
    }

    // Combine removed from CSV and stale
    const allToRemove = new Set([...removedIds, ...staleIds]);
    console.log(`  Found ${removedIds.size} from removed CSV, ${staleIds.length} stale listings`);
    console.log(`  Total to remove: ${allToRemove.size}`);

    // Delete in batches
    const toRemoveArray = Array.from(allToRemove);
    for (let i = 0; i < toRemoveArray.length; i += 100) {
      const batch = toRemoveArray.slice(i, i + 100);
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('source', 'china')
        .in('source_id', batch);

      if (!error) {
        removed += batch.length;
      } else {
        console.error(`  Error removing batch:`, error.message);
      }
    }

    console.log(`  Removed ${removed} vehicles`);
  }

  // Step 5: Update sync config
  console.log('\n[5/5] Updating sync configuration...');
  await supabase.from('sync_config').upsert({
    source: 'che168',
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
## CHE168 Sync Results

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
