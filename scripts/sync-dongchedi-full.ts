/**
 * Full Dongchedi Sync Script
 *
 * This script syncs ALL vehicles with valid photos from Dongchedi API.
 * It uses the API for vehicle details and CSV for photo links.
 *
 * Usage: npx tsx scripts/sync-dongchedi-full.ts [--max-pages=1000] [--download-photos]
 *
 * Options:
 *   --max-pages=N      Maximum pages to fetch from API (default: 1000, ~20k vehicles)
 *   --download-photos  Download and store photos on Supabase (slow but permanent)
 *   --remove-old       Remove vehicles not in API anymore
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = 'dongchedi-photos';

const API_BASE = 'https://api1.auto-api.com/api/v2/dongchedi';
const API_KEY = process.env.DONGCHEDI_API_KEY;
if (!API_KEY) {
  console.error('❌ DONGCHEDI_API_KEY non configurée');
  process.exit(1);
}
const CNY_TO_USD = 0.14;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse args
const args = process.argv.slice(2);
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : 1000;
const DOWNLOAD_PHOTOS = args.includes('--download-photos');
const REMOVE_OLD = args.includes('--remove-old');

function formatPgArray(arr: string[] | undefined | null): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '{}';
  const escaped = arr.map((s) => {
    if (typeof s !== 'string') return '""';
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  });
  return `{${escaped.join(',')}}`;
}

/**
 * Normalize URL encoding from CSV
 *
 * Problem: CSV URLs may have inconsistent encoding:
 * - Some have %2B for + (correct for URLs)
 * - Some have literal + (gets interpreted as space by servers)
 * - Some are double-encoded (%252B)
 *
 * Solution: Ensure + signs in query params are properly encoded as %2B
 */
function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  try {
    // First, handle double-encoding: %252B -> %2B, %253D -> %3D
    let normalized = url.replace(/%25([0-9A-Fa-f]{2})/g, '%$1');

    // Split URL into base and query string
    const questionIndex = normalized.indexOf('?');
    if (questionIndex === -1) return normalized;

    const base = normalized.substring(0, questionIndex);
    const query = normalized.substring(questionIndex + 1);

    // In query string, encode literal + as %2B (but don't double-encode existing %2B)
    // This ensures the signature is sent correctly to the server
    const fixedQuery = query.replace(/\+/g, '%2B');

    return base + '?' + fixedQuery;
  } catch {
    return url;
  }
}

/**
 * Normalize all image URLs in an array
 */
function normalizeImageUrls(urls: string[]): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(normalizeImageUrl);
}

/**
 * CDN servers that are blocked from most regions outside China
 */
const BLOCKED_CDN_PATTERNS = [
  'p3-dcd-sign.byteimg.com',
  'p6-dcd-sign.byteimg.com',
  'p1-dcd-sign.byteimg.com',
];

/**
 * Check if first image in array is from a working CDN
 */
function hasWorkingImages(images: string[]): boolean {
  if (!images || images.length === 0) return false;
  return !BLOCKED_CDN_PATTERNS.some(pattern => images[0].includes(pattern));
}

interface ApiOffer {
  id: string;           // API's internal ID
  inner_id: string;     // Dongchedi's inner_id - used to match with CSV
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

  // Extract offers from changes
  const offers: ApiOffer[] = [];
  for (const change of data.result || []) {
    if (change.change_type === 'added' && change.data?.url) {
      const d = change.data;
      // Parse images - API returns images as JSON string
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
        inner_id: String(d.inner_id),  // This matches CSV inner_id
        url: d.url,
        mark: d.mark,
        model: d.model,
        complectation: d.complectation || '',
        year: parseInt(d.year) || 0,
        price: parseFloat(d.price) || 0,
        mileage: parseInt(d.km_age) || 0,  // API uses km_age
        engine_volume: Math.round((parseFloat(d.displacement) || 0) * 1000),  // API uses displacement in liters, convert to cc
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
    console.log('  No CSV cache found, photos will use API URLs');
    return photoMap;
  }

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isFirst = true;
  let innerIdIdx = -1;
  let imagesIdx = -1;
  let syncedAtIdx = -1;

  for await (const line of rl) {
    if (isFirst) {
      const headers = line.split('|');
      innerIdIdx = headers.indexOf('inner_id');
      imagesIdx = headers.indexOf('images');
      syncedAtIdx = headers.indexOf('synced_at');
      isFirst = false;
      continue;
    }

    const cols = line.split('|');
    const innerId = cols[innerIdIdx]?.trim();
    const syncedAt = cols[syncedAtIdx]?.trim();

    if (!innerId || !syncedAt) continue;

    // Check if synced_at < 6 days
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
      // Skip
    }
  }

  console.log(`  Loaded ${photoMap.size} valid photo records from CSV`);
  return photoMap;
}

async function getExistingSourceIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from('vehicles')
      .select('source_id')
      .eq('source', 'china')
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    data.forEach(v => ids.add(v.source_id));
    offset += 1000;
    if (data.length < 1000) break;
  }

  return ids;
}

async function downloadAndUploadPhoto(sourceId: string, imageUrl: string, index: number): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DrivebyAfrica/1.0)' },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`${sourceId}/${index}.${ext}`, buffer, { contentType, upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`${sourceId}/${index}.${ext}`);
    return data.publicUrl;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Dongchedi Full Sync ===');
  console.log(`Options: max-pages=${MAX_PAGES}, download-photos=${DOWNLOAD_PHOTOS}, remove-old=${REMOVE_OLD}`);

  // Step 1: Load photo map from CSV
  console.log('\nStep 1: Loading photo map from CSV...');
  const photoMap = await loadPhotoMap();

  // Step 2: Get existing vehicle IDs
  console.log('\nStep 2: Getting existing vehicles...');
  const existingIds = await getExistingSourceIds();
  console.log(`  Found ${existingIds.size} existing vehicles`);

  // Step 3: Fetch all offers from API
  console.log(`\nStep 3: Fetching offers from API (max ${MAX_PAGES} pages)...`);

  const allOffers: ApiOffer[] = [];
  const allSourceIds = new Set<string>();
  let page = 1;

  while (page <= MAX_PAGES) {
    try {
      const { offers, hasMore } = await fetchOffersPage(page);

      for (const offer of offers) {
        // Use inner_id as source_id to match with CSV
        const sourceId = offer.inner_id;
        if (!allSourceIds.has(sourceId)) {
          allSourceIds.add(sourceId);
          allOffers.push(offer);
        }
      }

      if (page % 50 === 0) {
        console.log(`  Page ${page}: ${allOffers.length} total offers`);
      }

      if (!hasMore) {
        console.log(`  Reached end at page ${page}`);
        break;
      }

      page++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`  Error at page ${page}:`, (e as Error).message);
      break;
    }
  }

  console.log(`  Total offers fetched: ${allOffers.length}`);

  // Step 4: Prepare records for database
  console.log('\nStep 4: Preparing database records...');

  const stats = { added: 0, updated: 0, removed: 0, errors: 0, photosDownloaded: 0 };

  // Separate new and existing (use inner_id)
  const newOffers = allOffers.filter(o => !existingIds.has(o.inner_id));
  const existingOffers = allOffers.filter(o => existingIds.has(o.inner_id));

  console.log(`  New: ${newOffers.length}, Existing: ${existingOffers.length}`);

  // Step 5: Insert/update vehicles
  console.log('\nStep 5: Upserting vehicles to database...');

  const batchSize = 100;
  for (let i = 0; i < allOffers.length; i += batchSize) {
    const batch = allOffers.slice(i, i + batchSize);

    const records = batch.map(offer => {
      // Use inner_id as source_id to match with CSV
      const sourceId = offer.inner_id;
      // Use CSV photos if available (valid < 6 days), otherwise API photos
      const csvImages = photoMap.get(sourceId);
      const apiImages = Array.isArray(offer.images) ? offer.images : [];
      // Always decode URLs before storing to prevent encoding issues
      const images = normalizeImageUrls(csvImages || apiImages);

      // Skip vehicles with blocked CDN images
      if (!hasWorkingImages(images)) {
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
        original_price: offer.price,
        original_currency: 'CNY',
        auction_status: 'ongoing',
        images: formatPgArray(images) as unknown as string[],
      };
    });

    // Filter out null records (blocked CDN)
    const validRecords = records.filter(Boolean);
    if (validRecords.length === 0) continue;

    const { error } = await supabase.from('vehicles').upsert(validRecords, {
      onConflict: 'source,source_id',
    });

    if (error) {
      console.error(`  Batch error:`, error.message);
      stats.errors++;
    } else {
      stats.added += batch.filter(o => !existingIds.has(o.inner_id)).length;
      stats.updated += batch.filter(o => existingIds.has(o.inner_id)).length;
    }

    if ((i + batchSize) % 1000 === 0 || i + batchSize >= allOffers.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, allOffers.length)}/${allOffers.length}`);
    }
  }

  // Step 6: Remove old vehicles (optional)
  if (REMOVE_OLD) {
    console.log('\nStep 6: Removing old vehicles...');

    const toRemove: string[] = [];
    existingIds.forEach(id => {
      if (!allSourceIds.has(id)) toRemove.push(id);
    });

    console.log(`  Found ${toRemove.length} vehicles to remove`);

    for (let i = 0; i < toRemove.length; i += 100) {
      const batch = toRemove.slice(i, i + 100);
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('source', 'china')
        .in('source_id', batch);

      if (!error) stats.removed += batch.length;
    }
  }

  // Step 7: Download photos (optional)
  if (DOWNLOAD_PHOTOS) {
    console.log('\nStep 7: Downloading photos to Supabase Storage...');
    console.log('  (Limited to 500 vehicles - run download-photos.ts for more)');

    const { data: vehiclesNeedingPhotos } = await supabase
      .from('vehicles')
      .select('source_id, images')
      .eq('source', 'china')
      .limit(500);

    const toDownload = vehiclesNeedingPhotos?.filter(v => {
      const img = v.images?.[0] || '';
      return img.includes('byteimg.com') || img.includes('x-expires');
    }) || [];

    for (const v of toDownload.slice(0, 100)) {
      const photos = photoMap.get(v.source_id) || [];
      if (photos.length === 0) continue;

      const urls: string[] = [];
      for (let j = 0; j < Math.min(photos.length, 5); j++) {
        const url = await downloadAndUploadPhoto(v.source_id, photos[j], j);
        if (url) {
          urls.push(url);
          stats.photosDownloaded++;
        }
      }

      if (urls.length > 0) {
        await supabase
          .from('vehicles')
          .update({ images: urls })
          .eq('source', 'china')
          .eq('source_id', v.source_id);
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Added: ${stats.added}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Removed: ${stats.removed}`);
  console.log(`Photos downloaded: ${stats.photosDownloaded}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Total vehicles in API: ${allOffers.length}`);
}

main().catch(console.error);
