'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Vehicle, VehicleFilters } from '@/types/vehicle';
import { useFilterStore } from '@/store/useFilterStore';

interface UseVehiclesOptions {
  filters?: VehicleFilters;
  page?: number;
  limit?: number;
}

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  totalCount: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
}

// Query key factory for detail pages
export const vehicleKeys = {
  detail: (id: string) => ['vehicles', 'detail', id] as const,
};

/**
 * Fetch vehicles via the server-side /api/vehicles/list route.
 * All queries (including search) go through this route which uses
 * the service_role key (no statement timeout).
 */
async function fetchVehicles(
  filters: VehicleFilters | undefined,
  page: number,
  limit: number
): Promise<{ vehicles: Vehicle[]; totalCount: number }> {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  if (filters?.search && filters.search.trim().length >= 2) {
    params.set('search', filters.search.trim());
  }
  if (filters?.source && filters.source !== 'all') {
    params.set('source', filters.source);
  }
  if (filters?.makes && filters.makes.length > 0) {
    params.set('makes', filters.makes.join(','));
  }
  if (filters?.models && filters.models.length > 0) {
    params.set('models', filters.models.join(','));
  }
  if (filters?.yearFrom) params.set('yearFrom', filters.yearFrom.toString());
  if (filters?.yearTo) params.set('yearTo', filters.yearTo.toString());
  if (filters?.priceFrom) params.set('priceFrom', filters.priceFrom.toString());
  if (filters?.priceTo) params.set('priceTo', filters.priceTo.toString());
  if (filters?.mileageMax) params.set('mileageMax', filters.mileageMax.toString());
  if (filters?.transmission) params.set('transmission', filters.transmission);
  if (filters?.fuelType) params.set('fuelType', filters.fuelType);
  if (filters?.driveType) params.set('driveType', filters.driveType);
  if (filters?.bodyType) params.set('bodyType', filters.bodyType);
  if (filters?.color) params.set('color', filters.color);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.newArrivals) params.set('newArrivals', 'true');

  const response = await fetch(`/api/vehicles/list?${params.toString()}`, {
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error || 'Échec du chargement des véhicules.';
    throw new Error(msg);
  }

  return {
    vehicles: data.vehicles || [],
    totalCount: data.totalCount || 0,
  };
}

export function useVehicles({
  filters,
  page = 1,
  limit = 36,
}: UseVehiclesOptions = {}): UseVehiclesReturn {
  const queryClient = useQueryClient();
  const hasHydrated = useFilterStore((s) => s._hasHydrated);

  // Serialize filters into a stable string for the query key.
  // This guarantees React Query detects every filter/sort change reliably.
  const filterKey = JSON.stringify(filters ?? {});

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['vehicles', 'list', filterKey, page, limit],
    queryFn: () => fetchVehicles(filters, page, limit),
    enabled: hasHydrated,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    // No retries — prevents infinite re-render loop on 500 errors
    retry: false,
  });

  // Prefetch next page for smoother pagination
  useEffect(() => {
    if (data && data.vehicles.length === limit) {
      const currentOffset = (page - 1) * limit + data.vehicles.length;
      if (currentOffset < data.totalCount) {
        const nextFilterKey = JSON.stringify(filters ?? {});
        queryClient.prefetchQuery({
          queryKey: ['vehicles', 'list', nextFilterKey, page + 1, limit],
          queryFn: () => fetchVehicles(filters, page + 1, limit),
          staleTime: 60 * 1000,
        });
      }
    }
  }, [data, filters, page, limit, queryClient]);

  // Wrapper for refetch to match the original interface
  const refetch = async () => {
    await queryRefetch();
  };

  // Calculate if there are more pages based on totalCount
  const currentOffset = (page - 1) * limit + (data?.vehicles.length ?? 0);
  const hasMorePages = currentOffset < (data?.totalCount ?? 0);

  return {
    vehicles: data?.vehicles ?? [],
    isLoading: !hasHydrated || isLoading,
    isFetching,
    error: error as Error | null,
    totalCount: data?.totalCount ?? 0,
    hasMore: hasMorePages,
    refetch,
  };
}

/**
 * Hook to invalidate vehicle cache (use after mutations)
 */
export function useInvalidateVehicles() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(id) }),
  };
}
