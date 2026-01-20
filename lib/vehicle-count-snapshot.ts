import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Record current vehicle count snapshot to history table
 * Call this after each sync to maintain accurate daily counts
 */
export async function recordVehicleCountSnapshot(): Promise<{
  success: boolean;
  counts?: {
    total: number;
    korea: number;
    china: number;
    dubai: number;
  };
  error?: string;
}> {
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
    const { error } = await supabase
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
      });

    if (error) {
      console.error('[VehicleCountSnapshot] Error:', error);
      return { success: false, error: error.message };
    }

    const counts = {
      total: totalCount || 0,
      korea: koreaCount || 0,
      china: chinaCount || 0,
      dubai: dubaiCount || 0,
    };

    console.log(`[VehicleCountSnapshot] Recorded for ${today}:`, counts);
    return { success: true, counts };
  } catch (error) {
    console.error('[VehicleCountSnapshot] Failed:', error);
    return { success: false, error: (error as Error).message };
  }
}
