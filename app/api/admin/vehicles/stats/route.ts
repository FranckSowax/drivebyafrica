import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client Supabase admin (untyped for flexibility with new tables)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // Get vehicle counts by status
    // Note: status, is_visible columns are added by migration 00003
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('source, auction_status, start_price_usd');

    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    // Type for vehicle row data
    type VehicleRow = {
      source: string;
      auction_status?: string;
      start_price_usd?: number;
      status?: string;
      is_visible?: boolean;
    };
    const vehicleRows = (vehicles || []) as VehicleRow[];

    // Calculate stats
    const stats = {
      total: vehicleRows?.length || 0,
      byStatus: {
        available: 0,
        reserved: 0,
        sold: 0,
        pending: 0,
      },
      bySource: {
        korea: 0,
        china: 0,
        dubai: 0,
      },
      hidden: 0,
      visible: 0,
      avgPrice: 0,
    };

    let totalPrice = 0;
    let priceCount = 0;

    vehicleRows?.forEach((v) => {
      // By status - use status column if available, fallback to auction_status
      const status = v.status || (v.auction_status === 'sold' ? 'sold' : 'available');
      if (status in stats.byStatus) {
        stats.byStatus[status as keyof typeof stats.byStatus]++;
      }

      // By source
      if (v.source in stats.bySource) {
        stats.bySource[v.source as keyof typeof stats.bySource]++;
      }

      // Visibility - default to visible if column doesn't exist
      if (v.is_visible === false) {
        stats.hidden++;
      } else {
        stats.visible++;
      }

      // Price
      if (v.start_price_usd) {
        totalPrice += v.start_price_usd;
        priceCount++;
      }
    });

    stats.avgPrice = priceCount > 0 ? Math.round(totalPrice / priceCount) : 0;

    // Get sync config
    const { data: syncConfig } = await supabase
      .from('sync_config')
      .select('*')
      .eq('source', 'encar')
      .single();

    // Get recent sync logs
    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats,
      syncConfig,
      syncLogs,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
