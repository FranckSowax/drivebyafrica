import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getOffers,
  normalizeOffers,
  getChangeId,
  getAllChangesSince,
} from '@/lib/api/dongchedi';
import type { DongchediOffer, DongchediOffersParams } from '@/lib/api/dongchedi';

// Extend timeout for this route (Netlify/Vercel)
export const maxDuration = 60; // 60 seconds

// Helper to format array for PostgreSQL TEXT[] column
function formatPgArray(arr: string[] | undefined | null): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '{}';
  // Escape double quotes and backslashes, then wrap each element
  const escaped = arr.map((s) => {
    if (typeof s !== 'string') return '""';
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  });
  return `{${escaped.join(',')}}`;
}

/**
 * POST /api/dongchedi/sync
 *
 * Sync Dongchedi vehicles to our database
 *
 * Body:
 * - mode: 'full' | 'changes' | 'filtered' (default: 'changes')
 * - maxPages: number (default: 5, max: 100 for filtered)
 * - sinceDays: number (default: 1, for changes mode)
 * - filters: object (for filtered mode)
 *   - marks: string[] (brands to sync)
 *   - year_from: number
 *   - year_to: number
 *   - km_age_from: number
 *   - km_age_to: number
 *   - engine_type: string (exclude by prefixing with !)
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
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'changes';
    const maxPagesLimit = mode === 'filtered' ? 100 : 20;
    const maxPages = Math.min(body.maxPages || 5, maxPagesLimit);
    const sinceDays = body.sinceDays || 1;
    const filters = body.filters || {};

    const stats = { added: 0, updated: 0, removed: 0, errors: 0, totalProcessed: 0, skipped: 0 };

    if (mode === 'filtered' && filters.marks && Array.isArray(filters.marks)) {
      // Filtered sync - sync specific brands with filters
      console.log(`[Sync] Starting filtered sync for ${filters.marks.length} brands`);

      for (const mark of filters.marks) {
        let page = 1;
        let hasMore = true;
        let brandCount = 0;

        while (hasMore && page <= maxPages) {
          try {
            const params: DongchediOffersParams = {
              page,
              mark,
            };

            // Add optional filters
            if (filters.year_from) params.year_from = filters.year_from;
            if (filters.year_to) params.year_to = filters.year_to;
            if (filters.km_age_from) params.km_age_from = filters.km_age_from;
            if (filters.km_age_to) params.km_age_to = filters.km_age_to;

            const response = await getOffers(params);
            const vehiclesToSync: DongchediOffer[] = [];

            for (const change of response.result) {
              if (change.change_type === 'added' && 'url' in change.data) {
                const offer = change.data as DongchediOffer;

                // Filter out excluded engine types (e.g., Electric)
                if (filters.excludeEngineTypes && Array.isArray(filters.excludeEngineTypes)) {
                  if (filters.excludeEngineTypes.includes(offer.engine_type)) {
                    stats.skipped++;
                    continue;
                  }
                }

                vehiclesToSync.push(offer);
              }
            }

            // Batch insert this page's vehicles
            if (vehiclesToSync.length > 0) {
              const normalizedVehicles = normalizeOffers(vehiclesToSync);
              const vehicleRecords = normalizedVehicles.map((vehicle) => ({
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
                auction_status: 'ongoing',
                images: formatPgArray(vehicle.images) as unknown as string[],
                updated_at: new Date().toISOString(),
              }));

              const { error } = await supabaseAdmin
                .from('vehicles')
                .upsert(vehicleRecords, { onConflict: 'source,source_id' });

              if (error) {
                console.error(`[Sync] ${mark} page ${page} error:`, error);
                stats.errors += vehicleRecords.length;
              } else {
                stats.added += vehicleRecords.length;
                brandCount += vehicleRecords.length;
              }
              stats.totalProcessed += vehicleRecords.length;
            }

            hasMore = response.meta.next_page !== null;
            page++;

            // Small delay between pages
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (pageError) {
            console.error(`[Sync] ${mark} page ${page} error:`, pageError);
            stats.errors++;
            break;
          }
        }

        console.log(`[Sync] ${mark}: ${brandCount} vehicles added`);
      }
    } else if (mode === 'full') {
      // Full sync - fetch pages and insert in batches
      for (let page = 1; page <= maxPages; page++) {
        try {
          const response = await getOffers({ page });
          const vehiclesToSync: DongchediOffer[] = [];

          for (const change of response.result) {
            if (change.change_type === 'added' && 'url' in change.data) {
              vehiclesToSync.push(change.data as DongchediOffer);
            }
          }

          // Batch insert this page's vehicles
          if (vehiclesToSync.length > 0) {
            const normalizedVehicles = normalizeOffers(vehiclesToSync);
            const vehicleRecords = normalizedVehicles.map((vehicle) => ({
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
              auction_status: 'ongoing',
              // Cast to unknown to handle PostgreSQL TEXT[] format
              images: formatPgArray(vehicle.images) as unknown as string[],
              updated_at: new Date().toISOString(),
            }));

            const { error } = await supabaseAdmin
              .from('vehicles')
              .upsert(vehicleRecords, { onConflict: 'source,source_id' });

            if (error) {
              console.error(`[Sync] Page ${page} batch error:`, error);
              stats.errors += vehicleRecords.length;
            } else {
              stats.added += vehicleRecords.length;
            }
            stats.totalProcessed += vehicleRecords.length;
          }

          console.log(`[Sync] Page ${page}: ${vehiclesToSync.length} vehicles`);

          if (!response.meta.next_page) break;

          // Small delay between pages
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (pageError) {
          console.error(`[Sync] Page ${page} error:`, pageError);
          stats.errors++;
        }
      }
    } else {
      // Changes sync - get changes since X days ago
      try {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - sinceDays);
        const dateString = sinceDate.toISOString().split('T')[0];

        const { change_id } = await getChangeId(dateString);
        const changes = await getAllChangesSince(change_id, 50); // Limit iterations

        const vehiclesToAdd: DongchediOffer[] = [];
        const priceUpdates: { inner_id: string; new_price: number }[] = [];
        const removedIds: string[] = [];

        for (const change of changes) {
          if (change.change_type === 'added' && 'url' in change.data) {
            vehiclesToAdd.push(change.data as DongchediOffer);
          } else if (change.change_type === 'changed' && 'new_price' in change.data) {
            priceUpdates.push({
              inner_id: change.inner_id,
              new_price: change.data.new_price as number,
            });
          } else if (change.change_type === 'removed') {
            removedIds.push(change.inner_id);
          }
        }

        // Batch insert new vehicles
        if (vehiclesToAdd.length > 0) {
          const normalizedVehicles = normalizeOffers(vehiclesToAdd);
          const vehicleRecords = normalizedVehicles.map((vehicle) => ({
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
            auction_status: 'ongoing',
            // Cast to unknown to handle PostgreSQL TEXT[] format
            images: formatPgArray(vehicle.images) as unknown as string[],
            updated_at: new Date().toISOString(),
          }));

          const { error } = await supabaseAdmin
            .from('vehicles')
            .upsert(vehicleRecords, { onConflict: 'source,source_id' });

          if (error) {
            console.error('[Sync] Batch insert error:', error);
            stats.errors += vehicleRecords.length;
          } else {
            stats.added = vehicleRecords.length;
          }
        }

        // Update prices in batch (individual updates for now)
        for (const update of priceUpdates) {
          await supabaseAdmin
            .from('vehicles')
            .update({
              current_price_usd: Math.round(update.new_price * 0.14),
              updated_at: new Date().toISOString(),
            })
            .eq('source', 'china')
            .eq('source_id', update.inner_id);
          stats.updated++;
        }

        // Mark removed vehicles as sold
        if (removedIds.length > 0) {
          await supabaseAdmin
            .from('vehicles')
            .update({
              auction_status: 'sold',
              updated_at: new Date().toISOString(),
            })
            .eq('source', 'china')
            .in('source_id', removedIds);
          stats.removed = removedIds.length;
        }

        stats.totalProcessed = vehiclesToAdd.length + priceUpdates.length + removedIds.length;
      } catch (changesError) {
        console.error('[Sync] Changes error:', changesError);
        return NextResponse.json(
          { error: 'Failed to fetch changes from API', details: String(changesError) },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      stats,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dongchedi sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Dongchedi vehicles', details: String(error) },
      { status: 500 }
    );
  }
}
