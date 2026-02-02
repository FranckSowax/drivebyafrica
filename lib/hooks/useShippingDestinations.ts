'use client';

import { useState, useEffect, useMemo } from 'react';

// Type pour les destinations
export interface ShippingDestination {
  id: string;
  name: string;
  country: string;
  flag: string;
  shippingCost: {
    korea: number;
    china: number;
    dubai: number;
  };
  shippingCost40ft: {
    korea: number;
    china: number;
    dubai: number;
  };
}

// Destinations de secours (utilisees si l'API echoue)
const FALLBACK_DESTINATIONS: ShippingDestination[] = [
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 3600, china: 4200, dubai: 3200 }, shippingCost40ft: { korea: 0, china: 0, dubai: 0 } },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 3400, china: 4000, dubai: 3000 }, shippingCost40ft: { korea: 0, china: 0, dubai: 0 } },
  { id: 'dakar', name: 'Dakar', country: 'Senegal', flag: '🇸🇳', shippingCost: { korea: 4600, china: 5200, dubai: 4200 }, shippingCost40ft: { korea: 0, china: 0, dubai: 0 } },
  { id: 'abidjan', name: 'Abidjan', country: "Cote d'Ivoire", flag: '🇨🇮', shippingCost: { korea: 4200, china: 4800, dubai: 3800 }, shippingCost40ft: { korea: 0, china: 0, dubai: 0 } },
];

interface UseShippingDestinationsOptions {
  searchQuery?: string;
}

interface UseShippingDestinationsResult {
  destinations: ShippingDestination[];
  filteredDestinations: ShippingDestination[];
  isLoading: boolean;
  lastUpdatedAt: string | null;
  error: string | null;
}

/**
 * Hook to fetch and manage shipping destinations
 * Used by both ShippingEstimator (vehicles) and BatchShippingEstimator (batches)
 */
export function useShippingDestinations(
  options: UseShippingDestinationsOptions = {}
): UseShippingDestinationsResult {
  const { searchQuery = '' } = options;

  const [destinations, setDestinations] = useState<ShippingDestination[]>(FALLBACK_DESTINATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch destinations from API
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/shipping');
        const data = await response.json();

        if (data.destinations && data.destinations.length > 0) {
          setDestinations(data.destinations);
        }
        if (data.lastUpdatedAt) {
          setLastUpdatedAt(data.lastUpdatedAt);
        }
      } catch (err) {
        console.error('Error fetching shipping destinations:', err);
        setError('Failed to load destinations');
        // Keep fallback destinations
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinations();
  }, []);

  // Filter destinations based on search query
  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) {
      return destinations;
    }

    const query = searchQuery.toLowerCase();
    return destinations.filter(
      (dest) =>
        dest.name.toLowerCase().includes(query) ||
        dest.country.toLowerCase().includes(query)
    );
  }, [destinations, searchQuery]);

  return {
    destinations,
    filteredDestinations,
    isLoading,
    lastUpdatedAt,
    error,
  };
}

// Export shipping types for reuse
export type ShippingType = 'container' | 'groupage';

export const SHIPPING_TYPES = [
  {
    id: 'container' as ShippingType,
    name: 'Container seul 20HQ',
    description: 'Expedition exclusive dans un container dedie',
    multiplier: 1,
  },
  {
    id: 'groupage' as ShippingType,
    name: 'Groupage maritime',
    description: 'Partage du container avec d\'autres commandes',
    multiplier: 0.5,
  },
] as const;
