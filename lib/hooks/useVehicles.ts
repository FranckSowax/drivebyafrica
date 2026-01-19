'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseImagesField } from '@/lib/utils/imageProxy';
import type { Vehicle, VehicleFilters } from '@/types/vehicle';

/**
 * Check if an image URL is valid (not expired)
 * NOTE: We no longer filter out vehicles - just flag them
 */
function isImageExpired(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false;

  // Check x-expires timestamp for Dongchedi images
  const expiresMatch = imageUrl.match(/x-expires=(\d+)/);
  if (expiresMatch) {
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
    // Add 1 hour buffer before considering expired
    return expiresTimestamp < Date.now() - 3600000;
  }

  return false;
}

/**
 * Check if a vehicle has any images (doesn't filter based on expiry)
 * Vehicles without ANY images are filtered out
 * Vehicles with expired images still show (with placeholder fallback in UI)
 */
function hasAnyImages(vehicle: Vehicle): boolean {
  const images = parseImagesField(vehicle.images);
  return images.length > 0;
}

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
  isError: boolean;
  totalCount: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  failureCount: number;
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
 * Fetch vehicles from Supabase with filters, pagination, and sorting
 */
async function fetchVehicles(
  filters: VehicleFilters | undefined,
  page: number,
  limit: number
): Promise<{ vehicles: Vehicle[]; totalCount: number }> {
  const supabase = createClient();

  let query = supabase.from('vehicles').select('*', { count: 'exact' });

  // Apply filters
  if (filters?.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }

  if (filters?.makes && filters.makes.length > 0) {
    query = query.in('make', filters.makes);
  }

  if (filters?.models && filters.models.length > 0) {
    query = query.in('model', filters.models);
  }

  if (filters?.yearFrom) {
    query = query.gte('year', filters.yearFrom);
  }

  if (filters?.yearTo) {
    query = query.lte('year', filters.yearTo);
  }

  if (filters?.priceFrom) {
    query = query.gte('current_price_usd', filters.priceFrom);
  }

  if (filters?.priceTo) {
    query = query.lte('current_price_usd', filters.priceTo);
  }

  if (filters?.mileageMax) {
    query = query.lte('mileage', filters.mileageMax);
  }

  if (filters?.transmission) {
    query = query.eq('transmission', filters.transmission);
  }

  if (filters?.fuelType) {
    query = query.eq('fuel_type', filters.fuelType);
  }

  if (filters?.driveType) {
    query = query.eq('drive_type', filters.driveType);
  }

  if (filters?.color) {
    query = query.ilike('color', `%${filters.color}%`);
  }

  if (filters?.bodyType) {
    query = query.eq('body_type', filters.bodyType);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  // Apply search (searches make and model)
  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    query = query.or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
  }

  // Apply sorting
  switch (filters?.sortBy) {
    case 'price_asc':
      query = query.order('start_price_usd', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('start_price_usd', { ascending: false, nullsFirst: false });
      break;
    case 'year_desc':
      query = query.order('year', { ascending: false, nullsFirst: false });
      break;
    case 'year_asc':
      query = query.order('year', { ascending: true, nullsFirst: false });
      break;
    case 'mileage_asc':
      query = query.order('mileage', { ascending: true, nullsFirst: false });
      break;
    case 'mileage_desc':
      query = query.order('mileage', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order('created_at', { ascending: false, nullsFirst: false });
      break;
  }

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error: queryError, count } = await query;

  if (queryError) {
    throw new Error(queryError.message);
  }

  // Only filter out vehicles with NO images at all
  // Vehicles with expired images will still show (UI handles fallback)
  const vehiclesWithImages = (data as Vehicle[]).filter(hasAnyImages);

  return {
    vehicles: vehiclesWithImages,
    totalCount: count || 0,
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
    isError,
    failureCount,
  } = useQuery({
    queryKey,
    queryFn: () => fetchVehicles(filters, page, limit),
    // Keep previous data while fetching new data (smooth pagination)
    placeholderData: (previousData) => previousData,
    // Data is fresh for 2 minutes (reduced for fresher data)
    staleTime: 2 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Enable retry with exponential backoff (3 attempts)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,
    // Refetch on reconnect
    refetchOnReconnect: true,
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

  // Wrapper for refetch that also clears errors
  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  // Calculate if there are more pages based on totalCount
  const currentOffset = (page - 1) * limit + (data?.vehicles.length ?? 0);
  const hasMorePages = currentOffset < (data?.totalCount ?? 0);

  return {
    vehicles: data?.vehicles ?? [],
    isLoading,
    isFetching,
    error: error as Error | null,
    isError,
    totalCount: data?.totalCount ?? 0,
    hasMore: hasMorePages,
    refetch,
    failureCount,
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
