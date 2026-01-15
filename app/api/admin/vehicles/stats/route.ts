import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client Supabase admin (untyped for flexibility with new tables)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      return NextResponse.json({ error: totalError.message }, { status: 500 });
    }

    // Get counts by source
    const { count: koreaCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'korea');

    const { count: chinaCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'china');

    const { count: dubaiCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'dubai');

    // Get counts by status
    const { count: availableCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.available,status.is.null');

    const { count: reservedCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'reserved');

    const { count: soldCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    const { count: pendingCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get average price using a sample (to avoid fetching all rows)
    const { data: priceData } = await supabase
      .from('vehicles')
      .select('start_price_usd')
      .not('start_price_usd', 'is', null)
      .limit(1000);

    let avgPrice = 0;
    if (priceData && priceData.length > 0) {
      const total = priceData.reduce((sum, v) => sum + (v.start_price_usd || 0), 0);
      avgPrice = Math.round(total / priceData.length);
    }

    // Get visibility counts
    const { count: hiddenCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('is_visible', false);

    // Calculate stats
    const stats = {
      total: totalCount || 0,
      byStatus: {
        available: availableCount || 0,
        reserved: reservedCount || 0,
        sold: soldCount || 0,
        pending: pendingCount || 0,
      },
      bySource: {
        korea: koreaCount || 0,
        china: chinaCount || 0,
        dubai: dubaiCount || 0,
      },
      hidden: hiddenCount || 0,
      visible: (totalCount || 0) - (hiddenCount || 0),
      avgPrice,
    };

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
      // Return flat structure for admin API page
      total: stats.total,
      bySource: stats.bySource,
      // Also include detailed stats for other pages
      stats,
      syncConfig,
      syncLogs,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
