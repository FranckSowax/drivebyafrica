'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
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

// Query key factory for better cache management
export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (filters: VehicleFilters | undefined, page: number, limit: number) =>
    [...vehicleKeys.lists(), { filters, page, limit }] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
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

  // Stable serialized filters for query key to avoid reference changes
  const stableFilters = useMemo(
    () => JSON.stringify(filters),
    [filters]
  );

  const queryKey = useMemo(
    () => vehicleKeys.list(filters, page, limit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableFilters, page, limit]
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchVehicles(filters, page, limit),
    // Don't fetch until Zustand store has hydrated from localStorage
    enabled: hasHydrated,
    // Keep previous data while fetching new data (smooth pagination & filter changes)
    placeholderData: (previousData) => previousData,
    // Data is fresh for 2 minutes
    staleTime: 2 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry transient errors
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Prefetch next page for smoother pagination
  // Only prefetch if there are more items beyond current page
  useEffect(() => {
    if (data && data.vehicles.length === limit) {
      const currentOffset = (page - 1) * limit + data.vehicles.length;
      const hasMoreItems = currentOffset < data.totalCount;

      if (hasMoreItems) {
        const nextPageKey = vehicleKeys.list(filters, page + 1, limit);
        queryClient.prefetchQuery({
          queryKey: nextPageKey,
          queryFn: () => fetchVehicles(filters, page + 1, limit),
          staleTime: 5 * 60 * 1000,
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
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(id) }),
  };
}
