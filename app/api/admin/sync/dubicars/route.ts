import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordVehicleCountSnapshot } from '@/lib/vehicle-count-snapshot';

const API_BASE = 'https://api1.auto-api.com/api/v2/dubicars';
const API_KEY = process.env.DUBICARS_API_KEY || process.env.ENCAR_API_KEY || '';
// AED to USD conversion rate (1 AED = 0.2723 USD, pegged rate)
const AED_TO_USD = 0.2723;

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
    images: string;
    city: string;
    seller_type: string;
    section: string;
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
 * Map vehicle data to database format
 */
function mapToDbRecord(offer: ApiOffer) {
  const v = offer.data;
  const sourceId = `dubicars_${v.inner_id}`;
  const images = parseImages(v.images);

  // Parse price (AED to USD conversion)
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const maxPages = Math.min(body.maxPages || 500, 2000); // Limit for admin panel
    const removeExpired = body.removeExpired !== false;

    console.log(`Dubicars sync started: maxPages=${maxPages}, removeExpired=${removeExpired}`);

    // Get existing vehicles
    const existingVehicles = new Set<string>();
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from('vehicles')
        .select('source_id')
        .eq('source', 'dubai')
        .eq('auction_platform', 'dubicars')
        .range(offset, offset + 999);

      if (!data || data.length === 0) break;
      data.forEach(v => existingVehicles.add(v.source_id));
      offset += 1000;
      if (data.length < 1000) break;
    }

    console.log(`Found ${existingVehicles.size} existing Dubicars vehicles`);

    // Fetch from API
    const allVehicles: ApiOffer[] = [];
    const seenIds = new Set<string>();
    let page = 1;
    let emptyPages = 0;

    while (page <= maxPages) {
      try {
        const url = `${API_BASE}/offers?api_key=${API_KEY}&page=${page}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const offers = data.result || [];
        const nextPage = data.meta?.next_page;

        if (offers.length === 0) {
          emptyPages++;
          if (emptyPages >= 3) break;
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

        if (!nextPage || offers.length === 0) break;

        page++;
        await new Promise(r => setTimeout(r, 50)); // Rate limiting
      } catch (e) {
        console.error(`Error at page ${page}:`, e);
        page++;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`Fetched ${allVehicles.length} vehicles from API`);

    // Upsert vehicles
    const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };
    const currentSourceIds = new Set<string>();
    const batchSize = 100;

    for (let i = 0; i < allVehicles.length; i += batchSize) {
      const batch = allVehicles.slice(i, i + batchSize);
      const records = batch
        .map(v => {
          try {
            const record = mapToDbRecord(v);
            if (!record.images || record.images.length === 0) {
              stats.skipped++;
              return null;
            }
            currentSourceIds.add(record.source_id);
            return record;
          } catch {
            stats.errors++;
            return null;
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (records.length === 0) continue;

      const { error } = await supabase
        .from('vehicles')
        .upsert(records, {
          onConflict: 'source,source_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Batch error:`, error.message);
        stats.errors += records.length;
      } else {
        for (const record of records) {
          if (record && existingVehicles.has(record.source_id)) {
            stats.updated++;
          } else {
            stats.added++;
          }
        }
      }
    }

    // Remove expired vehicles
    let removed = 0;
    if (removeExpired) {
      const staleIds: string[] = [];
      for (const existingId of existingVehicles) {
        if (!currentSourceIds.has(existingId)) {
          staleIds.push(existingId);
        }
      }

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
        }
      }
    }

    // Update sync config (using any to bypass type checking for dynamic table)
    await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('sync_config').upsert({
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

    // Record vehicle count snapshot after sync
    await recordVehicleCountSnapshot();

    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      duration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
      stats: {
        processed: allVehicles.length,
        added: stats.added,
        updated: stats.updated,
        removed,
        skipped: stats.skipped,
        errors: stats.errors,
      },
    });
  } catch (error) {
    console.error('Dubicars sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
