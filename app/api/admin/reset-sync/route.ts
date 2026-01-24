import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getOffers,
  normalizeOffers,
} from '@/lib/api/dongchedi';
import type { DongchediOffer } from '@/lib/api/dongchedi';

// Helper to format array for PostgreSQL TEXT[] column
function formatPgArray(arr: string[] | undefined | null): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '{}';
  const escaped = arr.map((s) => {
    if (typeof s !== 'string') return '""';
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  });
  return `{${escaped.join(',')}}`;
}

/**
 * POST /api/admin/reset-sync
 *
 * Reset vehicles table and perform full sync from Dongchedi
 * This is an admin-only endpoint for initial setup or recovery
 *
 * Body:
 * - maxPages: number (default: 100)
 * - clearTable: boolean (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const maxPages = body.maxPages || 100;
    const clearTable = body.clearTable !== false;

    const stats = {
      clearedCount: 0,
      pagesProcessed: 0,
      vehiclesAdded: 0,
      errors: 0,
    };

    // Step 1: Clear vehicles table if requested
    if (clearTable) {
      console.log('[Reset Sync] Clearing vehicles table...');

      // First count existing vehicles
      const { count } = await supabaseAdmin
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      // Delete all vehicles
      const { error: deleteError } = await supabaseAdmin
        .from('vehicles')
        .delete()
        .gte('created_at', '1970-01-01');

      if (deleteError) {
        console.error('[Reset Sync] Error deleting vehicles:', deleteError);
        return NextResponse.json(
          { error: 'Failed to clear vehicles table', details: deleteError.message },
          { status: 500 }
        );
      }

      stats.clearedCount = count || 0;
      console.log(`[Reset Sync] Cleared ${stats.clearedCount} vehicles`);
    }

    // Step 2: Fetch all vehicles from Dongchedi
    console.log(`[Reset Sync] Starting full sync (max ${maxPages} pages)...`);

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await getOffers({ page });
        stats.pagesProcessed++;

        const vehiclesToSync: DongchediOffer[] = [];

        for (const change of response.result) {
          if (change.change_type === 'added' && 'url' in change.data) {
            vehiclesToSync.push(change.data as DongchediOffer);
          }
        }

        // Normalize and insert vehicles
        if (vehiclesToSync.length > 0) {
          const normalizedVehicles = normalizeOffers(vehiclesToSync);

          for (const vehicle of normalizedVehicles) {
            const { error } = await supabaseAdmin
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
                  auction_status: 'ongoing',
                  // Cast to unknown to handle PostgreSQL TEXT[] format
                  images: formatPgArray(vehicle.images) as unknown as string[],
                  updated_at: new Date().toISOString(),
                },
                {
                  onConflict: 'source,source_id',
                }
              );

            if (error) {
              console.error(`[Reset Sync] Error inserting vehicle ${vehicle.source_id}:`, error);
              stats.errors++;
            } else {
              stats.vehiclesAdded++;
            }
          }
        }

        console.log(`[Reset Sync] Page ${page}: Added ${vehiclesToSync.length} vehicles`);

        // Check if there are more pages
        if (!response.meta.next_page) {
          console.log('[Reset Sync] No more pages, sync complete');
          break;
        }

        // Rate limiting - wait 200ms between pages
        await new Promise((resolve) => setTimeout(resolve, 200));

      } catch (pageError) {
        console.error(`[Reset Sync] Error on page ${page}:`, pageError);
        stats.errors++;
        // Continue to next page on error
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      syncedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Reset Sync] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to reset and sync vehicles' },
      { status: 500 }
    );
  }
}
