'use client';

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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

  if (filters?.search && filters.search.trim().length >= 3) {
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

/**
 * Build an explicit queryKey from individual filter values.
 * Each element is a primitive (string | number | boolean | undefined),
 * so React Query detects changes via simple === comparison.
 */
function buildQueryKey(f: VehicleFilters | undefined, page: number, limit: number) {
  return [
    'vehicles', 'list',
    page, limit,
    f?.sortBy ?? 'newest',
    f?.source ?? 'all',
    f?.search ?? '',
    f?.makes?.join(',') ?? '',
    f?.models?.join(',') ?? '',
    f?.yearFrom ?? 0,
    f?.yearTo ?? 0,
    f?.priceFrom ?? 0,
    f?.priceTo ?? 0,
    f?.mileageMax ?? 0,
    f?.transmission ?? '',
    f?.fuelType ?? '',
    f?.driveType ?? '',
    f?.bodyType ?? '',
    f?.color ?? '',
    f?.status ?? '',
    f?.newArrivals ?? false,
  ] as const;
}

export function useVehicles({
  filters,
  page = 1,
  limit = 36,
}: UseVehiclesOptions = {}): UseVehiclesReturn {
  const queryClient = useQueryClient();
  const hasHydrated = useFilterStore((s) => s._hasHydrated);

  const queryKey = buildQueryKey(filters, page, limit);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchVehicles(filters, page, limit),
    enabled: hasHydrated,
    // Show previous data while new data loads (prevents loading flash on filter change)
    placeholderData: keepPreviousData,
    // Override QueryClient defaults — always refetch on key change
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    structuralSharing: false,
  });

  // Prefetch next page
  useEffect(() => {
    if (data && data.vehicles.length === limit) {
      const currentOffset = (page - 1) * limit + data.vehicles.length;
      if (currentOffset < data.totalCount) {
        queryClient.prefetchQuery({
          queryKey: buildQueryKey(filters, page + 1, limit),
          queryFn: () => fetchVehicles(filters, page + 1, limit),
          staleTime: 60 * 1000,
          retry: false,
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
