/**
 * Dongchedi CI Sync Script
 *
 * Optimized for GitHub Actions - syncs vehicles and manages expired photos.
 * Downloads CSV first to get fresh photo URLs, then syncs via API.
 *
 * Usage: npx tsx scripts/sync-dongchedi-ci.ts [options]
 *
 * Options:
 *   --max-pages=N         Max pages to fetch (default: 500 = ~10,000 vehicles)
 *   --remove-expired=bool Remove vehicles with expired photos (default: true)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const API_BASE = 'https://api1.auto-api.com/api/v2/dongchedi';
const API_KEY = process.env.DONGCHEDI_API_KEY || 'iT6g1fVqqGRAHeYkPFtU';
const CNY_TO_USD = 0.14;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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
const REMOVE_EXPIRED = getArg('remove-expired', 'true') === 'true';

function formatPgArray(arr: string[] | undefined | null): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '{}';
  const escaped = arr.map((s) => {
    if (typeof s !== 'string') return '""';
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  });
  return `{${escaped.join(',')}}`;
}

interface ApiOffer {
  id: string;
  inner_id: string;
  url: string;
  mark: string;
  model: string;
  complectation: string;
  year: number;
  price: number;
  mileage: number;
  engine_volume: number;
  engine_type: string;
  transmission_type: string;
  drive_type: string;
  body_type: string;
  color: string;
  images: string[];
}

async function fetchOffersPage(page: number): Promise<{ offers: ApiOffer[]; hasMore: boolean }> {
  const url = `${API_BASE}/offers?api_key=${API_KEY}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const offers: ApiOffer[] = [];

  for (const change of data.result || []) {
    if (change.change_type === 'added' && change.data?.url) {
      const d = change.data;
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
        id: String(d.id),
        inner_id: String(d.inner_id),
        url: d.url,
        mark: d.mark,
        model: d.model,
        complectation: d.complectation || '',
        year: parseInt(d.year) || 0,
        price: parseFloat(d.price) || 0,
        mileage: parseInt(d.km_age) || 0,
        engine_volume: Math.round((parseFloat(d.displacement) || 0) * 1000),
        engine_type: d.engine_type,
        transmission_type: d.transmission_type,
        drive_type: d.drive_type,
        body_type: d.body_type,
        color: d.color,
        images,
      });
    }
  }

  return {
    offers,
    hasMore: data.meta?.next_page !== null,
  };
}

async function loadPhotoMap(): Promise<Map<string, string[]>> {
  const csvPath = '/tmp/active_offer.csv';
  const photoMap = new Map<string, string[]>();

  if (!fs.existsSync(csvPath)) {
    console.log('  No CSV found at /tmp/active_offer.csv');
    return photoMap;
  }

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isFirst = true;
  let innerIdIdx = -1;
  let imagesIdx = -1;
  let syncedAtIdx = -1;
  let lineCount = 0;

  for await (const line of rl) {
    if (isFirst) {
      const headers = line.split('|');
      innerIdIdx = headers.indexOf('inner_id');
      imagesIdx = headers.indexOf('images');
      syncedAtIdx = headers.indexOf('synced_at');
      isFirst = false;
      continue;
    }

    lineCount++;
    const cols = line.split('|');
    const innerId = cols[innerIdIdx]?.trim();
    const syncedAt = cols[syncedAtIdx]?.trim();

    if (!innerId || !syncedAt) continue;

    // Check if synced_at < 6 days (photos expire after 6 days)
    const syncDate = new Date(syncedAt);
    const diffDays = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= 6) continue;

    let imagesJson = cols[imagesIdx]?.trim() || '';
    imagesJson = imagesJson.replace(/^"|"$/g, '').replace(/""/g, '"');

    try {
      const images = JSON.parse(imagesJson);
      if (Array.isArray(images) && images.length > 0) {
        photoMap.set(innerId, images);
      }
    } catch {
      // Skip malformed
    }
  }

  console.log(`  Loaded ${photoMap.size} valid photo records from CSV (${lineCount} total lines)`);
  return photoMap;
}

async function getExistingVehicles(): Promise<Map<string, { id: string; images: string[] }>> {
  const vehicles = new Map<string, { id: string; images: string[] }>();
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from('vehicles')
      .select('id, source_id, images')
      .eq('source', 'china')
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    data.forEach(v => vehicles.set(v.source_id, { id: v.id, images: v.images || [] }));
    offset += 1000;
    if (data.length < 1000) break;
  }

  return vehicles;
}

function isPhotoValid(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false;
  if (imageUrl.includes('supabase')) return true;  // Uploaded photos are permanent

  // Check x-expires timestamp
  const expiresMatch = imageUrl.match(/x-expires=(\d+)/);
  if (expiresMatch) {
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
    return expiresTimestamp > Date.now();
  }

  return false;
}

async function main() {
  const startTime = Date.now();
  console.log('=== Dongchedi CI Sync ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Options: max-pages=${MAX_PAGES}, remove-expired=${REMOVE_EXPIRED}`);

  // Step 1: Load photo map from CSV
  console.log('\n[1/5] Loading photo map from CSV...');
  const photoMap = await loadPhotoMap();

  // Step 2: Get existing vehicles
  console.log('\n[2/5] Fetching existing vehicles from database...');
  const existingVehicles = await getExistingVehicles();
  console.log(`  Found ${existingVehicles.size} existing China vehicles`);

  // Step 3: Fetch offers from API
  console.log(`\n[3/5] Fetching offers from API (max ${MAX_PAGES} pages)...`);

  const allOffers: ApiOffer[] = [];
  const allSourceIds = new Set<string>();
  let page = 1;

  while (page <= MAX_PAGES) {
    try {
      const { offers, hasMore } = await fetchOffersPage(page);

      for (const offer of offers) {
        const sourceId = offer.inner_id;
        if (!allSourceIds.has(sourceId)) {
          allSourceIds.add(sourceId);
          allOffers.push(offer);
        }
      }

      if (page % 100 === 0) {
        console.log(`  Page ${page}: ${allOffers.length} unique offers`);
      }

      if (!hasMore) {
        console.log(`  Reached end at page ${page}`);
        break;
      }

      page++;
      await new Promise(r => setTimeout(r, 50)); // Small delay
    } catch (e) {
      console.error(`  Error at page ${page}:`, (e as Error).message);
      break;
    }
  }

  console.log(`  Total unique offers: ${allOffers.length}`);

  // Step 4: Upsert vehicles
  console.log('\n[4/5] Upserting vehicles to database...');

  const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };
  const batchSize = 100;

  for (let i = 0; i < allOffers.length; i += batchSize) {
    const batch = allOffers.slice(i, i + batchSize);

    const records = batch.map(offer => {
      const sourceId = offer.inner_id;
      // Prefer fresh CSV photos over API photos
      const csvImages = photoMap.get(sourceId);
      const apiImages = Array.isArray(offer.images) ? offer.images : [];
      const images = csvImages || apiImages;

      // Skip if no valid photos
      if (images.length === 0 || !isPhotoValid(images[0])) {
        stats.skipped++;
        return null;
      }

      return {
        source: 'china',
        source_id: sourceId,
        source_url: offer.url,
        make: offer.mark,
        model: offer.model,
        grade: offer.complectation,
        year: offer.year,
        mileage: offer.mileage,
        engine_cc: offer.engine_volume,
        fuel_type: offer.engine_type,
        transmission: offer.transmission_type,
        drive_type: offer.drive_type,
        body_type: offer.body_type,
        color: offer.color,
        start_price_usd: Math.round(offer.price * CNY_TO_USD),
        current_price_usd: Math.round(offer.price * CNY_TO_USD),
        auction_status: 'ongoing',
        images: formatPgArray(images) as unknown as string[],
      };
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

    if ((i + batchSize) % 2000 === 0 || i + batchSize >= allOffers.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, allOffers.length)}/${allOffers.length}`);
    }
  }

  // Step 5: Remove vehicles with expired photos
  let removed = 0;
  if (REMOVE_EXPIRED) {
    console.log('\n[5/5] Removing vehicles with expired photos...');

    // Find vehicles with expired photos
    const toRemove: string[] = [];

    for (const [sourceId, vehicle] of existingVehicles) {
      const firstImage = vehicle.images?.[0];
      if (!isPhotoValid(firstImage)) {
        toRemove.push(sourceId);
      }
    }

    console.log(`  Found ${toRemove.length} vehicles with expired photos`);

    for (let i = 0; i < toRemove.length; i += 100) {
      const batch = toRemove.slice(i, i + 100);
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('source', 'china')
        .in('source_id', batch);

      if (!error) removed += batch.length;
    }
  }

  // Summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n=== Summary ===');
  console.log(`Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log(`API offers fetched: ${allOffers.length}`);
  console.log(`Added: ${stats.added}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped (no valid photos): ${stats.skipped}`);
  console.log(`Removed (expired): ${removed}`);
  console.log(`Errors: ${stats.errors}`);

  // Output for GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `
## Dongchedi Sync Results

| Metric | Value |
|--------|-------|
| Duration | ${Math.floor(duration / 60)}m ${duration % 60}s |
| API Offers | ${allOffers.length} |
| Added | ${stats.added} |
| Updated | ${stats.updated} |
| Skipped | ${stats.skipped} |
| Removed | ${removed} |
| Errors | ${stats.errors} |
`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
