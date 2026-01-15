import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import type { Order, Profile, Quote } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch dashboard data in parallel
  const [
    { data: profile },
    { data: orders },
    { data: favorites },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id),
  ]);

  // Fetch quotes separately (using any to bypass type check for quotes table if needed)
  let quotesData: Quote[] = [];
  try {
    const { data: quotes } = await (supabase as any)
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    quotesData = (quotes || []) as Quote[];
  } catch (e) {
    // quotes table may not exist
  }

  const profileData = profile as Profile | null;
  const ordersData = (orders || []) as Order[];
  const favoritesCount = favorites?.length || 0;

  return (
    <DashboardClient
      profile={profileData}
      orders={ordersData}
      quotes={quotesData}
      favoritesCount={favoritesCount}
    />
  );
}
