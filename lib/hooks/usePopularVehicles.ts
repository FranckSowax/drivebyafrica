'use client';

import { useQuery } from '@tanstack/react-query';
import { parseImagesField } from '@/lib/utils/imageProxy';
import type { Vehicle } from '@/types/vehicle';

const FEATURED_BRANDS = ['jetour', 'changan', 'toyota', 'haval', 'zeekr', 'byd', 'geely'];

/**
 * Check if the first image URL of a vehicle has a valid (non-expired) signed URL
 */
function hasValidImage(vehicle: Vehicle): boolean {
  const images = parseImagesField(vehicle.images);
  if (images.length === 0) return false;
  const firstImage = images[0];
  // Check for x-expires in signed URLs
  const match = firstImage.match(/x-expires=(\d+)/);
  if (!match) return true; // No expiry = always valid
  const expiresTimestamp = parseInt(match[1]) * 1000;
  return Date.now() < expiresTimestamp;
}

async function fetchPopularVehicles(): Promise<Vehicle[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const params = new URLSearchParams();
  params.set('select', [
    'id', 'source', 'source_id', 'source_url', 'make', 'model', 'grade',
    'year', 'mileage', 'start_price_usd', 'current_price_usd',
    'buy_now_price_usd', 'fuel_type', 'transmission', 'drive_type',
    'body_type', 'color', 'engine_cc', 'images', 'status',
    'auction_status', 'auction_platform', 'auction_date', 'is_visible',
    'created_at', 'updated_at',
    'views_count', 'favorites_count',
  ].join(','));

  params.append('status', 'eq.available');
  params.append('is_visible', 'eq.true');
  params.append('or', `(${FEATURED_BRANDS.map(b => `make.ilike.*${b}*`).join(',')})`);
  params.set('order', 'favorites_count.desc.nullslast,views_count.desc.nullslast');
  params.set('limit', '12');

  const url = `${supabaseUrl}/rest/v1/vehicles?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch popular vehicles: ${response.status}`);
  }

  const vehicles = (await response.json()) as Vehicle[];

  if (!vehicles || vehicles.length === 0) {
    // Fallback: fetch any popular vehicles regardless of brand
    const fallbackParams = new URLSearchParams();
    fallbackParams.set('select', params.get('select')!);
    fallbackParams.append('status', 'eq.available');
    fallbackParams.append('is_visible', 'eq.true');
    fallbackParams.set('order', 'favorites_count.desc.nullslast,views_count.desc.nullslast');
    fallbackParams.set('limit', '6');

    const fallbackUrl = `${supabaseUrl}/rest/v1/vehicles?${fallbackParams.toString()}`;
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!fallbackResponse.ok) {
      throw new Error(`Failed to fetch fallback vehicles: ${fallbackResponse.status}`);
    }

    return (await fallbackResponse.json()) as Vehicle[];
  }

  // Score and sort, prioritizing vehicles with valid (non-expired) images
  const scored = vehicles.map(v => ({
    vehicle: v,
    score: (v.views_count || 0) + ((v.favorites_count || 0) * 3),
    validImage: hasValidImage(v),
  }));

  // Put vehicles with valid images first, then sort by score
  scored.sort((a, b) => {
    if (a.validImage !== b.validImage) return a.validImage ? -1 : 1;
    return b.score - a.score;
  });

  return scored.slice(0, 6).map(s => s.vehicle);
}

export function usePopularVehicles() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles', 'popular'],
    queryFn: fetchPopularVehicles,
    staleTime: 10 * 60 * 1000,   // Fresh for 10 minutes
    gcTime: 30 * 60 * 1000,      // Cache for 30 minutes
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  return {
    vehicles: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
