'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseImagesField } from '@/lib/utils/imageProxy';
import type { Vehicle, VehicleFilters } from '@/types/vehicle';

/**
 * Check if an image URL is valid (not expired)
 * Dongchedi images have x-expires timestamp in URL
 */
function isImageValid(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false;

  // Supabase storage URLs are permanent
  if (imageUrl.includes('supabase')) return true;

  // Encar/Korea images are usually permanent
  if (imageUrl.includes('encar') || imageUrl.includes('ci.encar.com')) return true;

  // Check x-expires timestamp for Dongchedi images
  const expiresMatch = imageUrl.match(/x-expires=(\d+)/);
  if (expiresMatch) {
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
    return expiresTimestamp > Date.now();
  }

  // Other URLs are considered valid
  return true;
}

/**
 * Check if a vehicle has valid images
 */
function hasValidImages(vehicle: Vehicle): boolean {
  const images = parseImagesField(vehicle.images);
  if (images.length === 0) return false;
  return isImageValid(images[0]);
}

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

// Simple in-memory cache for vehicles
const vehicleCache = new Map<string, { vehicles: Vehicle[]; totalCount: number; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

function getCacheKey(filters: VehicleFilters | undefined, page: number, limit: number): string {
  return JSON.stringify({ filters: filters || {}, page, limit });
}

export function useVehicles({
  filters,
  page = 1,
  limit = 36,
}: UseVehiclesOptions = {}): UseVehiclesReturn {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Create supabase client once and store in ref to prevent re-renders
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Track current request to prevent race conditions
  const requestIdRef = useRef(0);

  // Stable reference to filters
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchVehicles = useCallback(async () => {
    const currentFilters = filtersRef.current;
    const cacheKey = getCacheKey(currentFilters, page, limit);

    // Check cache first
    const cached = vehicleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (isMountedRef.current) {
        setVehicles(cached.vehicles);
        setTotalCount(cached.totalCount);
        setIsLoading(false);
      }
      return;
    }

    // Increment request ID
    const thisRequestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('vehicles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (currentFilters?.source && currentFilters.source !== 'all') {
        query = query.eq('source', currentFilters.source);
      }

      if (currentFilters?.makes && currentFilters.makes.length > 0) {
        query = query.in('make', currentFilters.makes);
      }

      if (currentFilters?.models && currentFilters.models.length > 0) {
        query = query.in('model', currentFilters.models);
      }

      if (currentFilters?.yearFrom) {
        query = query.gte('year', currentFilters.yearFrom);
      }

      if (currentFilters?.yearTo) {
        query = query.lte('year', currentFilters.yearTo);
      }

      if (currentFilters?.priceFrom) {
        query = query.gte('current_price_usd', currentFilters.priceFrom);
      }

      if (currentFilters?.priceTo) {
        query = query.lte('current_price_usd', currentFilters.priceTo);
      }

      if (currentFilters?.mileageMax) {
        query = query.lte('mileage', currentFilters.mileageMax);
      }

      if (currentFilters?.transmission) {
        query = query.eq('transmission', currentFilters.transmission);
      }

      if (currentFilters?.fuelType) {
        query = query.eq('fuel_type', currentFilters.fuelType);
      }

      if (currentFilters?.driveType) {
        query = query.eq('drive_type', currentFilters.driveType);
      }

      if (currentFilters?.color) {
        query = query.ilike('color', `%${currentFilters.color}%`);
      }

      if (currentFilters?.bodyType) {
        query = query.eq('body_type', currentFilters.bodyType);
      }

      if (currentFilters?.status) {
        query = query.eq('status', currentFilters.status);
      }

      // Apply search (searches make and model)
      if (currentFilters?.search && currentFilters.search.trim()) {
        const searchTerm = currentFilters.search.trim().toLowerCase();
        query = query.or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      switch (currentFilters?.sortBy) {
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

      // Check if this is still the current request and component is mounted
      if (thisRequestId !== requestIdRef.current || !isMountedRef.current) {
        return;
      }

      if (queryError) {
        throw new Error(queryError.message);
      }

      // Filter out vehicles with empty or expired images
      const validVehicles = (data as Vehicle[]).filter(hasValidImages);

      // Update cache
      vehicleCache.set(cacheKey, {
        vehicles: validVehicles,
        totalCount: count || 0,
        timestamp: Date.now(),
      });

      setVehicles(validVehicles);
      setTotalCount(count || 0);
    } catch (err) {
      if (thisRequestId === requestIdRef.current && isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch vehicles'));
      }
    } finally {
      if (thisRequestId === requestIdRef.current && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, page, limit]);

  // Effect for initial load and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;
    fetchVehicles();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchVehicles, filters]);

  return {
    vehicles,
    isLoading,
    error,
    totalCount,
    hasMore: vehicles.length === limit,
    refetch: fetchVehicles,
  };
}
