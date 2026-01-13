'use client';

import { useState, useEffect, useMemo } from 'react';

/**
 * Dongchedi Filters Response from API
 */
interface DongchediFiltersResponse {
  mark: Record<string, {
    model: Record<string, {
      complectation: string[];
    }>;
  }>;
  transmission_type: string[];
  color: string[];
  body_type: string[];
  engine_type: string[];
  drive_type: string[];
}

/**
 * Processed filters for the UI
 */
export interface ProcessedFilters {
  brands: string[];
  models: Record<string, string[]>;
  transmissionTypes: string[];
  colors: string[];
  bodyTypes: string[];
  engineTypes: string[];
  driveTypes: string[];
  isLoading: boolean;
  error: string | null;
}

// Mapping for French labels
const TRANSMISSION_LABELS: Record<string, string> = {
  'Automatic': 'Automatique',
  'Manual': 'Manuelle',
  'CVT': 'CVT',
  'E-CVT': 'E-CVT',
  'DCT': 'Double embrayage',
  'Wet DCT': 'DCT humide',
  'Dry DCT': 'DCT sec',
  'AMT': 'Robotisee',
  'DHT': 'DHT',
  'Sequential': 'Sequentielle',
  'Single-Speed': 'Mono-vitesse',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  'SUV': 'SUV / Crossover',
  'Sedan': 'Berline',
  'Hatchback': 'Compacte',
  'Minivan': 'Monospace',
  'Wagon': 'Break',
  'Coupe': 'Coupe',
  'Convertible': 'Cabriolet',
  'Pickup': 'Pick-up',
  'Liftback': 'Liftback',
  'Microvan': 'Microvan',
  'Sports Car': 'Voiture de sport',
  'Mini Truck': 'Mini camion',
  'Light Commercial': 'Utilitaire leger',
  'Motorhome': 'Camping-car',
};

const ENGINE_TYPE_LABELS: Record<string, string> = {
  'Petrol': 'Essence',
  'Diesel': 'Diesel',
  'Electric': 'Electrique',
  'Hybrid': 'Hybride',
  'PHEV': 'Hybride rechargeable',
  'EREV': 'Electrique a autonomie etendue',
  'Bi-Fuel': 'Bi-carburant',
  'CNG': 'GNV',
};

const DRIVE_TYPE_LABELS: Record<string, string> = {
  'FWD': 'Traction avant (FWD)',
  'RWD': 'Propulsion (RWD)',
  'AWD': 'AWD',
  '4WD': '4x4',
  'all-wheel': 'Integral',
  '4x4': '4x4',
};

const COLOR_LABELS: Record<string, string> = {
  'White': 'Blanc',
  'Black': 'Noir',
  'Silver': 'Argent',
  'Gray': 'Gris',
  'Grey': 'Gris',
  'Red': 'Rouge',
  'Blue': 'Bleu',
  'Green': 'Vert',
  'Brown': 'Marron',
  'Beige': 'Beige',
  'Gold': 'Or',
  'Orange': 'Orange',
  'Yellow': 'Jaune',
  'Purple': 'Violet',
  'Pink': 'Rose',
};

// Color hex values for UI
export const COLOR_HEX: Record<string, string> = {
  'White': '#FFFFFF',
  'Black': '#1a1a1a',
  'Silver': '#C0C0C0',
  'Gray': '#6B7280',
  'Grey': '#6B7280',
  'Red': '#DC2626',
  'Blue': '#2563EB',
  'Green': '#16A34A',
  'Brown': '#78350F',
  'Beige': '#D4B896',
  'Gold': '#FFD700',
  'Orange': '#F97316',
  'Yellow': '#EAB308',
  'Purple': '#7C3AED',
  'Pink': '#EC4899',
};

/**
 * Hook to fetch and process Dongchedi filters
 */
export function useDongchediFilters() {
  const [rawFilters, setRawFilters] = useState<DongchediFiltersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchFilters() {
      try {
        const response = await fetch('/api/dongchedi/filters');
        if (!response.ok) {
          throw new Error('Failed to fetch filters');
        }
        const data = await response.json();
        if (isMounted) {
          setRawFilters(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  const processedFilters = useMemo<ProcessedFilters>(() => {
    if (!rawFilters) {
      return {
        brands: [],
        models: {},
        transmissionTypes: [],
        colors: [],
        bodyTypes: [],
        engineTypes: [],
        driveTypes: [],
        isLoading,
        error,
      };
    }

    // Extract brands and models
    const brands = Object.keys(rawFilters.mark).sort();
    const models: Record<string, string[]> = {};

    for (const [brand, brandData] of Object.entries(rawFilters.mark)) {
      models[brand] = Object.keys(brandData.model).sort();
    }

    return {
      brands,
      models,
      transmissionTypes: rawFilters.transmission_type || [],
      colors: rawFilters.color || [],
      bodyTypes: rawFilters.body_type || [],
      engineTypes: rawFilters.engine_type || [],
      driveTypes: rawFilters.drive_type || [],
      isLoading,
      error,
    };
  }, [rawFilters, isLoading, error]);

  return processedFilters;
}

/**
 * Get French label for a filter value
 */
export function getFilterLabel(type: 'transmission' | 'body' | 'engine' | 'drive' | 'color', value: string): string {
  switch (type) {
    case 'transmission':
      return TRANSMISSION_LABELS[value] || value;
    case 'body':
      return BODY_TYPE_LABELS[value] || value;
    case 'engine':
      return ENGINE_TYPE_LABELS[value] || value;
    case 'drive':
      return DRIVE_TYPE_LABELS[value] || value;
    case 'color':
      return COLOR_LABELS[value] || value;
    default:
      return value;
  }
}

/**
 * Get color hex for a color name
 */
export function getColorHex(colorName: string): string {
  return COLOR_HEX[colorName] || '#808080';
}
