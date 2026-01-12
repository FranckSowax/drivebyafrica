'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
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

export function useVehicles({
  filters,
  page = 1,
  limit = 12,
}: UseVehiclesOptions = {}): UseVehiclesReturn {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const supabase = createClient();

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('vehicles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.source && filters.source !== 'all') {
        query = query.eq('source', filters.source);
      }

      if (filters?.makes && filters.makes.length > 0) {
        query = query.in('make', filters.makes);
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

      if (filters?.auctionStatus) {
        query = query.eq('auction_status', filters.auctionStatus);
      }

      // Apply sorting
      switch (filters?.sortBy) {
        case 'price_asc':
          query = query.order('current_price_usd', { ascending: true, nullsFirst: false });
          break;
        case 'price_desc':
          query = query.order('current_price_usd', { ascending: false, nullsFirst: false });
          break;
        case 'year_desc':
          query = query.order('year', { ascending: false, nullsFirst: false });
          break;
        case 'mileage_asc':
          query = query.order('mileage', { ascending: true, nullsFirst: false });
          break;
        case 'date_desc':
          query = query.order('auction_date', { ascending: false, nullsFirst: false });
          break;
        case 'date_asc':
        default:
          query = query.order('auction_date', { ascending: true, nullsFirst: false });
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

      setVehicles(data as Vehicle[]);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch vehicles'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filters, page, limit]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    isLoading,
    error,
    totalCount,
    hasMore: vehicles.length === limit,
    refetch: fetchVehicles,
  };
}
