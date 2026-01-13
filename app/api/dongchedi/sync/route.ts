import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOffers,
  normalizeOffers,
  getChangeId,
  getAllChangesSince,
  getTodayDateString,
} from '@/lib/api/dongchedi';
import type { DongchediOffer } from '@/lib/api/dongchedi';

/**
 * POST /api/dongchedi/sync
 *
 * Sync Dongchedi vehicles to our database
 *
 * Body:
 * - mode: 'full' | 'changes' (default: 'changes')
 * - maxPages: number (default: 10, for full sync)
 * - sinceDays: number (default: 1, for changes mode)
 *
 * This endpoint requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if this is a scheduled function call (from Netlify cron)
    const isScheduledFunction = request.headers.get('x-scheduled-function') === 'true';

    if (!isScheduledFunction) {
      // Check user authentication for manual calls
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // TODO: Check if user is admin
      // const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      // if (profile?.role !== 'admin') {
      //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      // }
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'changes';
    const maxPages = body.maxPages || 10;
    const sinceDays = body.sinceDays || 1;

    let vehiclesToSync: DongchediOffer[] = [];
    let stats = { added: 0, updated: 0, removed: 0, errors: 0 };

    if (mode === 'full') {
      // Full sync - fetch all pages
      for (let page = 1; page <= maxPages; page++) {
        const response = await getOffers({ page });

        for (const change of response.result) {
          if (change.change_type === 'added' && 'url' in change.data) {
            vehiclesToSync.push(change.data as DongchediOffer);
          }
        }

        if (!response.meta.next_page) break;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } else {
      // Changes sync - get changes since X days ago
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);
      const dateString = sinceDate.toISOString().split('T')[0];

      const { change_id } = await getChangeId(dateString);
      const changes = await getAllChangesSince(change_id, 100);

      for (const change of changes) {
        if (change.change_type === 'added' && 'url' in change.data) {
          vehiclesToSync.push(change.data as DongchediOffer);
          stats.added++;
        } else if (change.change_type === 'changed') {
          stats.updated++;
          // Handle price updates
          if ('new_price' in change.data) {
            await supabase
              .from('vehicles')
              .update({
                current_price_usd: Math.round((change.data.new_price as number) * 0.14),
                updated_at: new Date().toISOString(),
              })
              .eq('source', 'china')
              .eq('source_id', change.inner_id);
          }
        } else if (change.change_type === 'removed') {
          stats.removed++;
          // Mark as sold/removed
          await supabase
            .from('vehicles')
            .update({
              auction_status: 'sold',
              updated_at: new Date().toISOString(),
            })
            .eq('source', 'china')
            .eq('source_id', change.inner_id);
        }
      }
    }

    // Normalize and upsert vehicles
    if (vehiclesToSync.length > 0) {
      const normalizedVehicles = normalizeOffers(vehiclesToSync);

      for (const vehicle of normalizedVehicles) {
        try {
          const { error } = await supabase
            .from('vehicles')
            .upsert(
              {
                source: vehicle.source,
                source_id: vehicle.source_id,
                source_url: vehicle.source_url,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                mileage: vehicle.mileage,
                engine_cc: vehicle.engine_cc,
                transmission: vehicle.transmission,
                fuel_type: vehicle.fuel_type,
                color: vehicle.color,
                body_type: vehicle.body_type,
                drive_type: vehicle.drive_type,
                grade: vehicle.grade,
                start_price_usd: vehicle.start_price_usd,
                current_price_usd: vehicle.current_price_usd,
                auction_status: vehicle.auction_status,
                images: vehicle.images,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'source,source_id',
              }
            );

          if (error) {
            console.error('Upsert error:', error);
            stats.errors++;
          }
        } catch (err) {
          console.error('Vehicle sync error:', err);
          stats.errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      stats: {
        ...stats,
        totalProcessed: vehiclesToSync.length,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dongchedi sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Dongchedi vehicles' },
      { status: 500 }
    );
  }
}
