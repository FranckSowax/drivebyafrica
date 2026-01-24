import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Backfill vehicle_count_history with historical data based on sync_logs
 * This endpoint estimates historical vehicle counts by working backwards from current counts
 * using the sync_logs data (vehicles_added, vehicles_removed)
 */
export async function POST() {
  try {
    // Use service role client to bypass RLS and access sync_logs table
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current vehicle counts by source
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

    // Get sync logs for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('date, source, vehicles_added, vehicles_removed')
      .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Group sync logs by date and source
    const syncByDateSource: Record<string, Record<string, { added: number; removed: number }>> = {};

    syncLogs?.forEach(log => {
      if (!log.date) return;
      if (!syncByDateSource[log.date]) {
        syncByDateSource[log.date] = {};
      }
      const source = log.source || 'unknown';
      if (!syncByDateSource[log.date][source]) {
        syncByDateSource[log.date][source] = { added: 0, removed: 0 };
      }
      syncByDateSource[log.date][source].added += log.vehicles_added || 0;
      syncByDateSource[log.date][source].removed += log.vehicles_removed || 0;
    });

    // Generate dates for last 90 days
    const dates: string[] = [];
    for (let i = 0; i < 90; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Calculate cumulative totals working backwards
    let runningTotal = totalCount || 0;
    let runningKorea = koreaCount || 0;
    let runningChina = chinaCount || 0;
    let runningDubai = dubaiCount || 0;

    const historyRecords: Array<{
      date: string;
      total_count: number;
      korea_count: number;
      china_count: number;
      dubai_count: number;
      recorded_at: string;
    }> = [];

    // Work backwards from today
    for (const dateStr of dates) {
      historyRecords.push({
        date: dateStr,
        total_count: runningTotal,
        korea_count: runningKorea,
        china_count: runningChina,
        dubai_count: runningDubai,
        recorded_at: new Date().toISOString(),
      });

      // Subtract this day's changes to get previous day's count
      const daySync = syncByDateSource[dateStr];
      if (daySync) {
        // Total
        Object.values(daySync).forEach(sync => {
          runningTotal -= (sync.added - sync.removed);
        });

        // Korea
        if (daySync['korea'] || daySync['encar']) {
          const koreaSync = daySync['korea'] || daySync['encar'] || { added: 0, removed: 0 };
          runningKorea -= (koreaSync.added - koreaSync.removed);
        }

        // China
        ['china', 'che168', 'dongchedi'].forEach(src => {
          if (daySync[src]) {
            runningChina -= (daySync[src].added - daySync[src].removed);
          }
        });

        // Dubai
        ['dubai', 'dubicars', 'uae'].forEach(src => {
          if (daySync[src]) {
            runningDubai -= (daySync[src].added - daySync[src].removed);
          }
        });
      }

      // Ensure no negative values
      runningTotal = Math.max(0, runningTotal);
      runningKorea = Math.max(0, runningKorea);
      runningChina = Math.max(0, runningChina);
      runningDubai = Math.max(0, runningDubai);
    }

    // Upsert all records
    const { error: upsertError } = await supabase
      .from('vehicle_count_history')
      .upsert(historyRecords, { onConflict: 'date' });

    if (upsertError) {
      console.error('Error upserting history:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${historyRecords.length} days of vehicle count history`,
      currentCounts: {
        total: totalCount,
        korea: koreaCount,
        china: chinaCount,
        dubai: dubaiCount,
      },
    });
  } catch (error) {
    console.error('Error backfilling history:', error);
    return NextResponse.json(
      { error: 'Failed to backfill history', details: (error as Error).message },
      { status: 500 }
    );
  }
}
