import { createClient } from '@/lib/supabase/server';
import { LandingContent } from '@/components/home/LandingContent';
import type { Vehicle } from '@/types/vehicle';

// Popular brands to feature (Chinese + Japanese brands)
const FEATURED_BRANDS = ['jetour', 'changan', 'toyota', 'haval', 'zeekr', 'byd', 'geely'];

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch popular vehicles from featured brands
  // Score = views_count + (favorites_count * 3) - favorites weighted more
  const { data: popularVehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'available')
    .eq('is_visible', true)
    .or(FEATURED_BRANDS.map(brand => `make.ilike.%${brand}%`).join(','))
    .order('favorites_count', { ascending: false })
    .order('views_count', { ascending: false })
    .limit(12); // Fetch more for randomization

  let featuredVehicles: Vehicle[] = [];

  if (popularVehicles && popularVehicles.length > 0) {
    // Calculate popularity score and sort
    const vehiclesWithScore = popularVehicles.map(v => ({
      ...v,
      popularityScore: (v.views_count || 0) + ((v.favorites_count || 0) * 3)
    }));

    // Sort by score descending
    vehiclesWithScore.sort((a, b) => b.popularityScore - a.popularityScore);

    // If we have enough vehicles with engagement, take top 6
    const vehiclesWithEngagement = vehiclesWithScore.filter(v => v.popularityScore > 0);

    if (vehiclesWithEngagement.length >= 6) {
      featuredVehicles = vehiclesWithEngagement.slice(0, 6) as Vehicle[];
    } else {
      // Mix engaged vehicles with random ones from the pool
      const engagedSet = new Set(vehiclesWithEngagement.map(v => v.id));
      const otherVehicles = vehiclesWithScore.filter(v => !engagedSet.has(v.id));

      // Shuffle the other vehicles for variety
      for (let i = otherVehicles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherVehicles[i], otherVehicles[j]] = [otherVehicles[j], otherVehicles[i]];
      }

      featuredVehicles = [
        ...vehiclesWithEngagement,
        ...otherVehicles.slice(0, 6 - vehiclesWithEngagement.length)
      ] as Vehicle[];
    }
  }

  // Fallback: If no featured brand vehicles, get any popular vehicles
  if (featuredVehicles.length < 6) {
    const { data: fallbackVehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'available')
      .eq('is_visible', true)
      .order('favorites_count', { ascending: false })
      .order('views_count', { ascending: false })
      .limit(6 - featuredVehicles.length);

    if (fallbackVehicles) {
      featuredVehicles = [...featuredVehicles, ...fallbackVehicles] as Vehicle[];
    }
  }

  return <LandingContent featuredVehicles={featuredVehicles} />;
}
