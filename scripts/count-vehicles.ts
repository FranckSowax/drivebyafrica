import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getCounts() {
  const { count: total } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
  const { count: china } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'china');
  const { count: dubai } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'dubai');
  const { count: dongchedi } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('auction_platform', 'dongchedi');
  const { count: che168 } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('auction_platform', 'che168');
  const { count: dubicars } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('auction_platform', 'dubicars');
  const { count: noplatform } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).is('auction_platform', null);
  
  console.log('=== Vehicles Count ===');
  console.log('By source:');
  console.log('  China:', china);
  console.log('  Dubai:', dubai);
  console.log('By platform:');
  console.log('  Dongchedi:', dongchedi);
  console.log('  CHE168:', che168);
  console.log('  Dubicars:', dubicars);
  console.log('  No platform (null):', noplatform);
  console.log('Total:', total);
}
getCounts();
