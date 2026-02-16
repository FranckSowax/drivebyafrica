'use client';

import { useQuery } from '@tanstack/react-query';
import type { Vehicle } from '@/types/vehicle';

async function fetchPopularVehicles(): Promise<Vehicle[]> {
  const response = await fetch('/api/vehicles/popular');

  if (!response.ok) {
    throw new Error(`Failed to fetch popular vehicles: ${response.status}`);
  }

  const data = await response.json();
  return data.vehicles || [];
}

export function usePopularVehicles() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles', 'popular'],
    queryFn: fetchPopularVehicles,
    staleTime: 5 * 60 * 1000,    // Fresh for 5 minutes (matches CDN cache)
    gcTime: 30 * 60 * 1000,      // Keep in memory 30 minutes
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  return {
    vehicles: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
