import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET: Retrieve vehicle count history
 * POST: Record current vehicle count snapshot
 */

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get last 90 days of history
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: history, error } = await supabase
      .from('vehicle_count_history')
      .select('*')
      .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      history,
      count: history?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    // Get current counts
    const { count: totalCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    const { count: koreaCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'korea');

    const { count: chinaCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .in('source', ['china', 'che168', 'dongchedi']);

    const { count: dubaiCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .in('source', ['dubai', 'dubicars', 'uae']);

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

    // Upsert today's count
    const { data, error } = await supabase
      .from('vehicle_count_history')
      .upsert({
        date: today,
        total_count: totalCount || 0,
        korea_count: koreaCount || 0,
        china_count: chinaCount || 0,
        dubai_count: dubaiCount || 0,
        available_count: availableCount || 0,
        reserved_count: reservedCount || 0,
        sold_count: soldCount || 0,
        recorded_at: new Date().toISOString(),
      }, {
        onConflict: 'date',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      date: today,
      counts: {
        total: totalCount || 0,
        korea: koreaCount || 0,
        china: chinaCount || 0,
        dubai: dubaiCount || 0,
        available: availableCount || 0,
        reserved: reservedCount || 0,
        sold: soldCount || 0,
      },
      recorded_at: data?.recorded_at,
    });
  } catch (error) {
    console.error('Error recording count:', error);
    return NextResponse.json(
      { error: 'Failed to record count', details: (error as Error).message },
      { status: 500 }
    );
  }
}
