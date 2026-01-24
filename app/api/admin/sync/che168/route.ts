import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getChe168Client } from '@/lib/api/che168';
import { mapChe168ToVehicle } from '@/lib/api/che168-sync';
import { recordVehicleCountSnapshot } from '@/lib/vehicle-count-snapshot';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// POST - Trigger CHE168 sync
export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const che168 = getChe168Client();

  try {
    const body = await request.json();
    const maxPages = body.maxPages || 100;
    const mark = body.mark;
    const model = body.model;

    const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };

    // Get existing vehicles from CHE168
    const existingIds = new Set<string>();
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from('vehicles')
        .select('source_id')
        .eq('source', 'china')
        .like('source_id', 'che168_%')
        .range(offset, offset + 999);

      if (!data || data.length === 0) break;
      data.forEach(v => existingIds.add(v.source_id));
      offset += 1000;
      if (data.length < 1000) break;
    }

    // Fetch offers from CHE168 API
    interface VehicleRecord {
      source: string;
      source_id: string;
      source_url: string;
      make: string;
      model: string;
      year: number;
      mileage: number;
      engine_cc: number | null;
      transmission: string;
      fuel_type: string;
      color: string;
      body_type: string;
      drive_type: string | null;
      grade: string;
      condition_report: string | null;
      start_price_usd: number | null;
      current_price_usd: number | null;
      auction_platform: string;
      auction_status: string;
      images: string[];
      created_at: string;
      updated_at: string;
    }

    const allRecords: VehicleRecord[] = [];
    const seenIds = new Set<string>();
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      try {
        const response = await che168.getOffers({
          page,
          mark,
          model,
        });

        for (const offer of response.result) {
          const vehicleData = mapChe168ToVehicle(offer.data);

          // Skip duplicates
          if (seenIds.has(vehicleData.source_id!)) {
            continue;
          }
          seenIds.add(vehicleData.source_id!);

          // Skip if no images
          if (!vehicleData.images || vehicleData.images.length === 0) {
            stats.skipped++;
            continue;
          }

          allRecords.push(vehicleData as VehicleRecord);
        }

        // Check for more pages
        if (response.meta.next_page === null) {
          hasMore = false;
        } else {
          page = response.meta.next_page;
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.error(`CHE168 error at page ${page}:`, (e as Error).message);
        stats.errors++;
        break;
      }
    }

    // Upsert vehicles in batches
    const batchSize = 100;

    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);

      const { error } = await supabase.from('vehicles').upsert(batch, {
        onConflict: 'source,source_id',
      });

      if (error) {
        console.error('CHE168 batch error:', error.message);
        stats.errors++;
      } else {
        const newCount = batch.filter(r => !existingIds.has(r.source_id)).length;
        const updateCount = batch.length - newCount;
        stats.added += newCount;
        stats.updated += updateCount;
      }
    }

    // Update sync status
    await supabase
      .from('sync_config')
      .upsert({
        source: 'che168',
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        total_vehicles: stats.added + stats.updated,
        vehicles_added: stats.added,
        vehicles_updated: stats.updated,
      }, {
        onConflict: 'source',
      });

    // Record vehicle count snapshot after sync
    await recordVehicleCountSnapshot();

    return NextResponse.json({
      success: true,
      source: 'che168',
      pagesProcessed: page - 1,
      offersFound: allRecords.length,
      ...stats,
    });
  } catch (error) {
    console.error('CHE168 sync error:', error);

    // Update sync status with error
    await supabase
      .from('sync_config')
      .upsert({
        source: 'che168',
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'failed',
        last_sync_error: error instanceof Error ? error.message : 'Sync failed',
      }, {
        onConflict: 'source',
      });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET - Get CHE168 stats
export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Count CHE168 vehicles
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'china')
      .like('source_id', 'che168_%');

    // Get sync config
    const { data: syncConfig } = await supabase
      .from('sync_config')
      .select('*')
      .eq('source', 'che168')
      .single();

    return NextResponse.json({
      source: 'che168',
      totalVehicles: count || 0,
      lastSync: syncConfig?.last_sync_at || null,
      lastStatus: syncConfig?.last_sync_status || null,
      lastError: syncConfig?.last_sync_error || null,
    });
  } catch (error) {
    console.error('Error getting CHE168 stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
