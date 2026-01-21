import { createClient } from '@supabase/supabase-js';

// Netlify Scheduled Function for daily Dongchedi sync
// Schedule: Run daily at 6 AM UTC
export const config = {
  schedule: '@daily',
};

const API_BASE = 'https://api1.auto-api.com/api/v2/dongchedi';
const API_KEY = process.env.DONGCHEDI_API_KEY || '';
const EXPORT_HOST = 'https://autobase-perez.auto-api.com';
// Build Basic Auth from environment variables
const EXPORT_LOGIN = process.env.DONGCHEDI_EXPORT_LOGIN || '';
const EXPORT_PASSWORD = process.env.DONGCHEDI_EXPORT_PASSWORD || '';
const EXPORT_AUTH = EXPORT_LOGIN && EXPORT_PASSWORD
  ? `Basic ${Buffer.from(`${EXPORT_LOGIN}:${EXPORT_PASSWORD}`).toString('base64')}`
  : '';
const CNY_TO_USD = 0.14;

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
 * These consistently return 403 errors
 */
const BLOCKED_CDN_PATTERNS = [
  'p3-dcd-sign.byteimg.com',
  'p6-dcd-sign.byteimg.com',
  'p1-dcd-sign.byteimg.com',
];

/**
 * Check if an image URL is from a blocked CDN server
 */
function isBlockedCdn(url: string): boolean {
  if (!url) return true;
  return BLOCKED_CDN_PATTERNS.some(pattern => url.includes(pattern));
}

/**
 * Check if first image in array is from a working CDN
 */
function hasWorkingImages(images: string[]): boolean {
  if (!images || images.length === 0) return false;
  return !isBlockedCdn(images[0]);
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface ApiOffer {
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

async function downloadAndParsePhotoCsv(): Promise<Map<string, string[]>> {
  const photoMap = new Map<string, string[]>();
  const date = getTodayDateString();
  const csvUrl = `${EXPORT_HOST}/dongchedi/${date}/active_offer.csv`;

  try {
    const response = await fetch(csvUrl, {
      headers: { 'Authorization': EXPORT_AUTH },
    });

    if (!response.ok) {
      console.log(`CSV for ${date} not available (${response.status}), trying yesterday...`);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayUrl = `${EXPORT_HOST}/dongchedi/${yesterday.toISOString().split('T')[0]}/active_offer.csv`;

      const yesterdayResponse = await fetch(yesterdayUrl, {
        headers: { 'Authorization': EXPORT_AUTH },
      });

      if (!yesterdayResponse.ok) {
        console.log('CSV not available, skipping photo update');
        return photoMap;
      }

      const csvContent = await yesterdayResponse.text();
      return parseCsvContent(csvContent, photoMap);
    }

    const csvContent = await response.text();
    return parseCsvContent(csvContent, photoMap);
  } catch (error) {
    console.error('Error downloading CSV:', error);
    return photoMap;
  }
}

function parseCsvContent(csvContent: string, photoMap: Map<string, string[]>): Map<string, string[]> {
  const lines = csvContent.split('\n');
  const header = lines[0].split('|');
  const innerIdIndex = header.indexOf('inner_id');
  const imagesIndex = header.indexOf('images');
  const syncedAtIndex = header.indexOf('synced_at');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const columns = line.split('|');
    const innerId = columns[innerIdIndex]?.trim();
    const syncedAt = columns[syncedAtIndex]?.trim();

    if (!innerId || !syncedAt) continue;

    // Check if synced_at < 6 days
    const syncDate = new Date(syncedAt);
    const diffDays = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= 6) continue;

    let imagesJson = columns[imagesIndex]?.trim() || '';
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

  return photoMap;
}

async function getExistingSourceIds(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<Set<string>> {
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

export default async function handler() {
  const startTime = Date.now();
  console.log('=== Dongchedi Daily Sync Started ===');

  try {
    const supabase = getSupabaseAdmin();

    // Step 1: Download and parse photo CSV
    console.log('Step 1: Downloading photo CSV...');
    const photoMap = await downloadAndParsePhotoCsv();
    console.log(`  Loaded ${photoMap.size} valid photo records`);

    // Step 2: Get existing vehicle IDs
    console.log('Step 2: Getting existing vehicles...');
    const existingIds = await getExistingSourceIds(supabase);
    console.log(`  Found ${existingIds.size} existing vehicles`);

    // Step 3: Fetch recent offers from API (limited to 500 pages for daily sync)
    console.log('Step 3: Fetching recent offers from API...');
    const allOffers: ApiOffer[] = [];
    const allSourceIds = new Set<string>();
    let page = 1;
    const maxPages = 500; // Daily sync: only recent changes

    while (page <= maxPages) {
      try {
        const { offers, hasMore } = await fetchOffersPage(page);

        for (const offer of offers) {
          if (!allSourceIds.has(offer.inner_id)) {
            allSourceIds.add(offer.inner_id);
            allOffers.push(offer);
          }
        }

        if (!hasMore) break;
        page++;
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        console.error(`Error at page ${page}:`, (e as Error).message);
        break;
      }
    }
    console.log(`  Fetched ${allOffers.length} offers from ${page} pages`);

    // Step 4: Upsert vehicles
    console.log('Step 4: Upserting vehicles...');
    const stats = { added: 0, updated: 0, errors: 0 };
    const batchSize = 100;

    for (let i = 0; i < allOffers.length; i += batchSize) {
      const batch = allOffers.slice(i, i + batchSize);

      const records = batch.map(offer => {
        const csvImages = photoMap.get(offer.inner_id);
        const apiImages = Array.isArray(offer.images) ? offer.images : [];
        // Always decode URLs before storing to prevent encoding issues
        const images = normalizeImageUrls(csvImages || apiImages);

        // Skip vehicles with blocked CDN images
        if (!hasWorkingImages(images)) {
          return null;
        }

        return {
          source: 'china',
          source_id: offer.inner_id,
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
        stats.errors++;
      } else {
        stats.added += batch.filter(o => !existingIds.has(o.inner_id)).length;
        stats.updated += batch.filter(o => existingIds.has(o.inner_id)).length;
      }
    }

    // Step 5: Update photo URLs for existing vehicles
    console.log('Step 5: Updating photo URLs for existing vehicles...');
    let photoUpdates = 0;
    const photoBatchSize = 50;
    const existingIdsArray = Array.from(existingIds);

    for (let i = 0; i < Math.min(existingIdsArray.length, 5000); i += photoBatchSize) {
      const batch = existingIdsArray.slice(i, i + photoBatchSize);

      const updatePromises = batch.map(async (sourceId) => {
        const images = photoMap.get(sourceId);
        if (!images) return false;

        // Always decode URLs before storing to prevent encoding issues
        const decodedImages = normalizeImageUrls(images);

        const { error } = await supabase
          .from('vehicles')
          .update({
            images: formatPgArray(decodedImages) as unknown as string[],
            updated_at: new Date().toISOString(),
          })
          .eq('source', 'china')
          .eq('source_id', sourceId);

        return !error;
      });

      const results = await Promise.all(updatePromises);
      photoUpdates += results.filter(Boolean).length;
    }

    const duration = Date.now() - startTime;

    console.log('=== Summary ===');
    console.log(`Added: ${stats.added}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Photo URLs updated: ${photoUpdates}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats: {
          added: stats.added,
          updated: stats.updated,
          photoUpdates,
          errors: stats.errors,
        },
        duration: `${(duration / 1000).toFixed(1)}s`,
      }),
    };
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Sync failed' }),
    };
  }
}
