import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordVehicleCountSnapshot } from '@/lib/vehicle-count-snapshot';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const API_BASE = 'https://api1.auto-api.com/api/v2/dongchedi';
const API_KEY = process.env.DONGCHEDI_API_KEY || '';
const CNY_TO_USD = 0.14;

// Blocked CDNs that return 403 from outside China
const BLOCKED_CDN_PATTERNS = [
  'p3-dcd-sign.byteimg.com',
  'p6-dcd-sign.byteimg.com',
  'p1-dcd-sign.byteimg.com',
];

function isBlockedCdn(url: string): boolean {
  if (!url) return true;
  return BLOCKED_CDN_PATTERNS.some(pattern => url.includes(pattern));
}

function isPhotoValid(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false;
  if (imageUrl.includes('supabase')) return true;

  const expiresMatch = imageUrl.match(/x-expires=(\d+)/);
  if (expiresMatch) {
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
    return expiresTimestamp > Date.now();
  }

  return false;
}

function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  try {
    let normalized = url.replace(/%25([0-9A-Fa-f]{2})/g, '%$1');

    const questionIndex = normalized.indexOf('?');
    if (questionIndex === -1) return normalized;

    const base = normalized.substring(0, questionIndex);
    const query = normalized.substring(questionIndex + 1);
    const fixedQuery = query.replace(/\+/g, '%2B');

    return base + '?' + fixedQuery;
  } catch {
    return url;
  }
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

// POST - Trigger Dongchedi sync
export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const body = await request.json();
    const maxPages = body.maxPages || 100; // Default 100 pages for quick sync via admin

    const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };

    // Get existing vehicles
    const existingIds = new Set<string>();
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from('vehicles')
        .select('source_id')
        .eq('source', 'china')
        .range(offset, offset + 999);

      if (!data || data.length === 0) break;
      data.forEach(v => existingIds.add(v.source_id));
      offset += 1000;
      if (data.length < 1000) break;
    }

    // Fetch offers from API
    const allOffers: ApiOffer[] = [];
    const allSourceIds = new Set<string>();
    let page = 1;

    while (page <= maxPages) {
      try {
        const { offers, hasMore } = await fetchOffersPage(page);

        for (const offer of offers) {
          const sourceId = offer.inner_id;
          if (!allSourceIds.has(sourceId)) {
            allSourceIds.add(sourceId);
            allOffers.push(offer);
          }
        }

        if (!hasMore) break;
        page++;
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        console.error(`Error at page ${page}:`, (e as Error).message);
        stats.errors++;
        break;
      }
    }

    // Upsert vehicles
    const batchSize = 100;

    for (let i = 0; i < allOffers.length; i += batchSize) {
      const batch = allOffers.slice(i, i + batchSize);

      const records = batch.map(offer => {
        const sourceId = offer.inner_id;
        const images = (Array.isArray(offer.images) ? offer.images : []).map(normalizeImageUrl);

        // Skip if no valid photos or blocked CDN
        if (images.length === 0 || !isPhotoValid(images[0]) || isBlockedCdn(images[0])) {
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
          original_price: offer.price,
          original_currency: 'CNY',
          auction_status: 'ongoing',
          images: images,
        };
      }).filter(Boolean);

      if (records.length === 0) continue;

      const { error } = await supabase.from('vehicles').upsert(records, {
        onConflict: 'source,source_id',
      });

      if (error) {
        console.error('Batch error:', error.message);
        stats.errors++;
      } else {
        const newCount = records.filter(r => r && !existingIds.has(r.source_id)).length;
        const updateCount = records.length - newCount;
        stats.added += newCount;
        stats.updated += updateCount;
      }
    }

    // Record vehicle count snapshot after sync
    await recordVehicleCountSnapshot();

    return NextResponse.json({
      success: true,
      source: 'dongchedi',
      pagesProcessed: page,
      offersFound: allOffers.length,
      ...stats,
    });
  } catch (error) {
    console.error('Dongchedi sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET - Get Dongchedi stats
export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'china');

    return NextResponse.json({
      source: 'dongchedi',
      totalVehicles: count || 0,
    });
  } catch (error) {
    console.error('Error getting Dongchedi stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
