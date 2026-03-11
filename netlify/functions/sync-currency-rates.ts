import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Scheduled Function: Sync live exchange rates
 * Fetches real rates from ExchangeRate-API and updates currency_rates table
 * Schedule: Every 6 hours
 */
export const config = {
  schedule: '0 */6 * * *', // Every 6 hours
};

const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/USD';

// All African currencies we track
const TRACKED_CURRENCIES = [
  'EUR', 'XAF', 'XOF', 'NGN', 'GHS', 'GNF', 'SLE', 'LRD', 'GMD', 'MRU', 'CVE',
  'CDF', 'AOA', 'STN', 'KES', 'TZS', 'UGX', 'RWF', 'BIF', 'ETB', 'DJF', 'ERN',
  'SOS', 'SSP', 'MAD', 'DZD', 'TND', 'LYD', 'EGP', 'SDG', 'ZAR', 'BWP', 'MZN',
  'ZMW', 'MWK', 'ZWL', 'NAD', 'SZL', 'LSL', 'MGA', 'MUR', 'SCR', 'KMF',
];

export default async function handler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return { statusCode: 500, body: 'Missing config' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch live rates
    const res = await fetch(EXCHANGE_API_URL);
    if (!res.ok) {
      console.error(`ExchangeRate API error: ${res.status}`);
      return { statusCode: 502, body: `API returned ${res.status}` };
    }

    const data = await res.json();
    if (data.result !== 'success' || !data.rates) {
      console.error('Invalid API response:', data);
      return { statusCode: 502, body: 'Invalid API response' };
    }

    const rates: Record<string, number> = data.rates;
    let updated = 0;
    let skipped = 0;

    // 2. Update each currency in DB
    for (const code of TRACKED_CURRENCIES) {
      const newRate = rates[code];
      if (!newRate) {
        skipped++;
        continue;
      }

      // Get current rate to log history
      const { data: current } = await supabase
        .from('currency_rates')
        .select('rate_to_usd')
        .eq('currency_code', code)
        .single();

      const oldRate = current?.rate_to_usd;

      // Update rate
      const { error } = await supabase
        .from('currency_rates')
        .update({
          rate_to_usd: newRate,
          updated_at: new Date().toISOString(),
        })
        .eq('currency_code', code);

      if (error) {
        console.error(`Failed to update ${code}:`, error.message);
        continue;
      }

      // Log history if rate changed significantly (> 0.1%)
      if (oldRate && Math.abs(newRate - oldRate) / oldRate > 0.001) {
        await supabase
          .from('currency_rate_history')
          .insert({
            currency_code: code,
            old_rate: oldRate,
            new_rate: newRate,
            note: 'Auto-sync ExchangeRate-API',
          });
      }

      updated++;
    }

    const summary = `Sync OK: ${updated} updated, ${skipped} skipped (${new Date().toISOString()})`;
    console.log(summary);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, updated, skipped, timestamp: data.time_last_update_utc }),
    };
  } catch (error: any) {
    console.error('Currency sync error:', error);
    return { statusCode: 500, body: error.message };
  }
}
