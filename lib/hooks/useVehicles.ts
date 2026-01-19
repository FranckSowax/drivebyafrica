'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { Vehicle, VehicleFilters } from '@/types/vehicle';

interface UseVehiclesOptions {
  filters?: VehicleFilters;
  page?: number;
  limit?: number;
}

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  isLoading: boolean;
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
 * Build PostgREST query string from filters
 */
function buildQueryString(
  filters: VehicleFilters | undefined,
  page: number,
  limit: number
): string {
  const params = new URLSearchParams();

  // Select all columns
  params.set('select', '*');

  // Apply filters
  if (filters?.source && filters.source !== 'all') {
    params.append('source', `eq.${filters.source}`);
  }

  if (filters?.makes && filters.makes.length > 0) {
    params.append('make', `in.(${filters.makes.join(',')})`);
  }

  if (filters?.models && filters.models.length > 0) {
    params.append('model', `in.(${filters.models.join(',')})`);
  }

  if (filters?.yearFrom) {
    params.append('year', `gte.${filters.yearFrom}`);
  }

  if (filters?.yearTo) {
    params.append('year', `lte.${filters.yearTo}`);
  }

  if (filters?.priceFrom) {
    params.append('current_price_usd', `gte.${filters.priceFrom}`);
  }

  if (filters?.priceTo) {
    params.append('current_price_usd', `lte.${filters.priceTo}`);
  }

  if (filters?.mileageMax) {
    params.append('mileage', `lte.${filters.mileageMax}`);
  }

  if (filters?.transmission) {
    params.append('transmission', `eq.${filters.transmission}`);
  }

  if (filters?.fuelType) {
    params.append('fuel_type', `eq.${filters.fuelType}`);
  }

  if (filters?.driveType) {
    params.append('drive_type', `eq.${filters.driveType}`);
  }

  if (filters?.color) {
    params.append('color', `ilike.*${filters.color}*`);
  }

  if (filters?.bodyType) {
    params.append('body_type', `eq.${filters.bodyType}`);
  }

  if (filters?.status) {
    params.append('status', `eq.${filters.status}`);
  }

  // Apply search (searches make and model)
  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim();
    params.append('or', `(make.ilike.*${searchTerm}*,model.ilike.*${searchTerm}*)`);
  }

  // Apply sorting
  let orderBy = 'created_at.desc';
  switch (filters?.sortBy) {
    case 'price_asc':
      orderBy = 'start_price_usd.asc.nullslast';
      break;
    case 'price_desc':
      orderBy = 'start_price_usd.desc.nullslast';
      break;
    case 'year_desc':
      orderBy = 'year.desc.nullslast';
      break;
    case 'year_asc':
      orderBy = 'year.asc.nullslast';
      break;
    case 'mileage_asc':
      orderBy = 'mileage.asc.nullslast';
      break;
    case 'mileage_desc':
      orderBy = 'mileage.desc.nullslast';
      break;
  }
  params.set('order', orderBy);

  // Apply pagination using offset/limit
  const from = (page - 1) * limit;
  params.set('offset', from.toString());
  params.set('limit', limit.toString());

  return params.toString();
}

/**
 * Fetch vehicles directly via PostgREST API (bypasses Supabase client auth issues)
 */
async function fetchVehicles(
  filters: VehicleFilters | undefined,
  page: number,
  limit: number
): Promise<{ vehicles: Vehicle[]; totalCount: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const queryString = buildQueryString(filters, page, limit);
  const url = `${supabaseUrl}/rest/v1/vehicles?${queryString}`;

  console.log('[useVehicles] Fetching:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[useVehicles] Fetch error:', response.status, errorText);
    throw new Error(`Failed to fetch vehicles: ${response.status}`);
  }

  const data = await response.json();

  // Get total count from Content-Range header
  const contentRange = response.headers.get('Content-Range');
  let totalCount = 0;
  if (contentRange) {
    // Format: "0-35/1234" or "*/0" if empty
    const match = contentRange.match(/\/(\d+)/);
    if (match) {
      totalCount = parseInt(match[1], 10);
    }
  }

  console.log('[useVehicles] Success:', {
    dataLength: data?.length || 0,
    totalCount,
    page,
    limit
  });

  return {
    vehicles: (data as Vehicle[]) || [],
    totalCount,
  };
}

export function useVehicles({
  filters,
  page = 1,
  limit = 36,
}: UseVehiclesOptions = {}): UseVehiclesReturn {
  const queryClient = useQueryClient();

  // Stable filters reference for query key
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const queryKey = vehicleKeys.list(filters, page, limit);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchVehicles(filters, page, limit),
    // Keep previous data while fetching new data (smooth pagination)
    placeholderData: (previousData) => previousData,
    // Data is fresh for 2 minutes
    staleTime: 2 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Enable retry for transient errors
    retry: 3,
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
    isLoading: isLoading || isFetching,
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
