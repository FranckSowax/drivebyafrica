import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for cron jobs
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  // CRON_SECRET must be configured — reject if missing
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 403 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get total vehicle count
    const { count: totalCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    // Get Korea count
    const { count: koreaCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'korea');

    // Get China count (includes che168 and dongchedi)
    const { count: chinaCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .in('source', ['china', 'che168', 'dongchedi']);

    // Get Dubai count
    const { count: dubaiCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .in('source', ['dubai', 'dubicars', 'uae']);

    // Get status counts
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

    // Upsert the count for today (update if exists, insert if not)
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
      console.error('Error saving vehicle count:', error);
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
    console.error('Cron vehicle count error:', error);
    return NextResponse.json(
      { error: 'Failed to record vehicle count', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
