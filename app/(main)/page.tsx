import { createClient } from '@/lib/supabase/server';
import { LandingContent } from '@/components/home/LandingContent';
import type { Vehicle } from '@/types/vehicle';

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch featured vehicles
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'available')
    .order('favorites_count', { ascending: false })
    .limit(6);

  const featuredVehicles = (data || []) as Vehicle[];

  return <LandingContent featuredVehicles={featuredVehicles} />;
}
