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

  // Select only necessary columns for list view (much faster than *)
  // Avoid loading large JSONB columns like full condition_report and all features
  params.set('select', [
    'id',
    'source',
    'source_id',
    'source_url',
    'make',
    'model',
    'grade',
    'year',
    'mileage',
    'start_price_usd',
    'current_price_usd',
    'buy_now_price_usd',
    'fuel_type',
    'transmission',
    'drive_type',
    'body_type',
    'color',
    'engine_cc',
    'images', // Keep images for thumbnails
    'status',
    'auction_status',
    'auction_platform',
    'auction_date',
    'is_visible',
    'created_at',
    'updated_at',
  ].join(','));

  // CRITICAL: Always filter visible vehicles only (reduces 190k+ to much smaller set)
  params.append('is_visible', 'eq.true');

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

  // New arrivals: vehicles added in the last 48 hours
  if (filters?.newArrivals) {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    params.append('created_at', `gte.${since}`);
  }

  // Apply search across make and model only
  // Avoid grade/source_id ILIKE — short terms like "i3" match too many rows and cause 500 timeouts
  if (filters?.search && filters.search.trim().length >= 2) {
    const searchTerm = filters.search.trim();
    params.append('or', `(make.ilike.*${searchTerm}*,model.ilike.*${searchTerm}*)`);
  }

  // Apply sorting - use id as secondary sort for consistency
  let orderBy = 'id.desc';
  switch (filters?.sortBy) {
    case 'newest':
      orderBy = 'id.desc';
      break;
    case 'price_asc':
      orderBy = 'start_price_usd.asc.nullslast,id.desc';
      break;
    case 'price_desc':
      orderBy = 'start_price_usd.desc.nullsfirst,id.desc';
      break;
    case 'year_desc':
      orderBy = 'year.desc.nullslast,id.desc';
      break;
    case 'year_asc':
      orderBy = 'year.asc.nullslast,id.desc';
      break;
    case 'mileage_asc':
      orderBy = 'mileage.asc.nullslast,id.desc';
      break;
    case 'mileage_desc':
      orderBy = 'mileage.desc.nullsfirst,id.desc';
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
 * Check if any meaningful filter is active (narrows results beyond default)
 */
function hasActiveFilters(filters: VehicleFilters | undefined): boolean {
  if (!filters) return false;
  return !!(
    (filters.source && filters.source !== 'all') ||
    (filters.makes && filters.makes.length > 0) ||
    (filters.models && filters.models.length > 0) ||
    filters.yearFrom ||
    filters.yearTo ||
    filters.priceFrom ||
    filters.priceTo ||
    filters.mileageMax ||
    filters.transmission ||
    filters.fuelType ||
    filters.driveType ||
    filters.color ||
    filters.bodyType ||
    filters.status ||
    filters.newArrivals ||
    (filters.search && filters.search.trim().length >= 2)
  );
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

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      // Use estimated count for unfiltered queries (190k+ rows) and text search (ILIKE is slow)
      // Use exact count only for non-search filters that narrow the set efficiently
      'Prefer': hasActiveFilters(filters) && !(filters?.search && filters.search.trim().length >= 2)
        ? 'count=exact'
        : 'count=estimated',
    },
  });

  // 200 = all results, 206 = partial content (paginated with count header)
  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to fetch vehicles: ${response.status}`);
  }

  const data = await response.json();
  const vehicles = (data as Vehicle[]) || [];

  // Get total count from Content-Range header
  // With count=exact, this gives accurate total for pagination
  const contentRange = response.headers.get('Content-Range');
  let totalCount = 0;
  if (contentRange) {
    // Format: "0-35/1234" or "*/0" if empty
    const match = contentRange.match(/\/(\d+)/);
    if (match) {
      totalCount = parseInt(match[1], 10);
    }
  }

  // If no count available (filters applied), estimate based on results
  // If we got a full page, there's likely more data
  if (totalCount === 0 && vehicles.length > 0) {
    totalCount = vehicles.length === limit ? vehicles.length * 100 : vehicles.length;
  }

  return {
    vehicles,
    totalCount,
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
    isLoading: !hasHydrated || isLoading,
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
