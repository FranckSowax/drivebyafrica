'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Filters loaded directly from Supabase vehicles table
 * This provides accurate filter options based on actual inventory
 */
export interface VehicleFiltersData {
  brands: string[];
  models: Record<string, string[]>;
  transmissionTypes: string[];
  fuelTypes: string[];
  driveTypes: string[];
  bodyTypes: string[];
  colors: string[];
  years: { min: number; max: number };
  isLoading: boolean;
  error: string | null;
}

// French translations - keys must match exact values from Supabase
const TRANSMISSION_FR: Record<string, string> = {
  // Lowercase (actual Supabase values)
  'automatic': 'Automatique',
  'manual': 'Manuelle',
  'single-speed': 'Vitesse unique',
  'wet DCT': 'Double embrayage humide',
  // Uppercase variants
  'CVT': 'CVT',
  'DCT': 'Double embrayage',
  'E-CVT': 'E-CVT',
  'DHT': 'DHT',
  'AMT': 'Robotisée',
  '-': '-',
  // Chinese/Dongchedi values
  '自动': 'Automatique',
  '手动': 'Manuelle',
  '无级变速': 'CVT',
  '双离合': 'Double embrayage',
  '手自一体': 'Auto/Manuel',
  // Korean/Encar values
  '오토': 'Automatique',
  '수동': 'Manuelle',
};

const FUEL_TYPE_FR: Record<string, string> = {
  // Lowercase (actual Supabase values)
  'petrol': 'Essence',
  'diesel': 'Diesel',
  'electric': 'Électrique',
  'hybrid': 'Hybride',
  'PHEV': 'Hybride rechargeable',
  'EREV': 'Électrique prolongée',
  '-': '-',
  // Uppercase variants
  'Petrol': 'Essence',
  'Gasoline': 'Essence',
  'Diesel': 'Diesel',
  'Electric': 'Électrique',
  'Hybrid': 'Hybride',
  'LPG': 'GPL',
  // Chinese values
  '汽油': 'Essence',
  '柴油': 'Diesel',
  '纯电动': 'Électrique',
  '插电式混合动力': 'Hybride rechargeable',
  '油电混合': 'Hybride',
  '增程式': 'Électrique prolongée',
  // Korean values
  '가솔린': 'Essence',
  '디젤': 'Diesel',
  '전기': 'Électrique',
  '하이브리드': 'Hybride',
};

const DRIVE_TYPE_FR: Record<string, string> = {
  'FWD': 'Traction (FWD)',
  'RWD': 'Propulsion (RWD)',
  'AWD': 'Intégrale (AWD)',
  '4WD': '4x4',
  '4x4': '4x4',
  // Chinese
  '前驱': 'Traction (FWD)',
  '后驱': 'Propulsion (RWD)',
  '四驱': '4x4',
  // Korean
  '전륜': 'Traction (FWD)',
  '후륜': 'Propulsion (RWD)',
  '사륜': '4x4',
};

const BODY_TYPE_FR: Record<string, string> = {
  // Lowercase (actual Supabase values)
  'sedan': 'Berline',
  'hatchback': 'Compacte',
  'wagon': 'Break',
  'coupe': 'Coupé',
  'convertible': 'Cabriolet',
  'pickup': 'Pick-up',
  'minivan': 'Monospace',
  'liftback': 'Liftback',
  'bus': 'Bus',
  'light commercial': 'Utilitaire léger',
  'motorhome': 'Camping-car',
  'double cab': 'Double cabine',
  'sports car': 'Voiture de sport',
  'microvan': 'Microvan',
  // Uppercase variants
  'SUV': 'SUV',
  'Sedan': 'Berline',
  'Hatchback': 'Compacte',
  'Wagon': 'Break',
  'Coupe': 'Coupé',
  'Convertible': 'Cabriolet',
  'Pickup': 'Pick-up',
  'Van': 'Monospace',
  'Minivan': 'Monospace',
  'MPV': 'Monospace',
  // Chinese
  '轿车': 'Berline',
  '两厢车': 'Compacte',
  '跑车': 'Coupé',
  '皮卡': 'Pick-up',
  '旅行车': 'Break',
  '微型车': 'Citadine',
  '中大型SUV': 'Grand SUV',
  '紧凑型SUV': 'SUV Compact',
  '中型SUV': 'SUV Moyen',
  '小型SUV': 'Petit SUV',
  '紧凑型车': 'Compacte',
  '中型车': 'Berline moyenne',
  '中大型车': 'Grande berline',
};

const COLOR_FR: Record<string, string> = {
  // Lowercase (actual Supabase values)
  'white': 'Blanc',
  'black': 'Noir',
  'silver': 'Argent',
  'dark gray': 'Gris foncé',
  'red': 'Rouge',
  'blue': 'Bleu',
  'green': 'Vert',
  'brown': 'Marron',
  'orange': 'Orange',
  'yellow': 'Jaune',
  'purple': 'Violet',
  'champagne': 'Champagne',
  'other': 'Autre',
  // Uppercase variants
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
  // Chinese
  '白': 'Blanc',
  '白色': 'Blanc',
  '黑': 'Noir',
  '黑色': 'Noir',
  '银': 'Argent',
  '银色': 'Argent',
  '灰': 'Gris',
  '灰色': 'Gris',
  '红': 'Rouge',
  '红色': 'Rouge',
  '蓝': 'Bleu',
  '蓝色': 'Bleu',
  '绿': 'Vert',
  '绿色': 'Vert',
  '棕': 'Marron',
  '棕色': 'Marron',
  '金': 'Or',
  '金色': 'Or',
  '橙': 'Orange',
  '橙色': 'Orange',
  '黄': 'Jaune',
  '黄色': 'Jaune',
};

// Color hex mapping
const COLOR_HEX: Record<string, string> = {
  // French translations
  'Blanc': '#FFFFFF',
  'Noir': '#1a1a1a',
  'Argent': '#C0C0C0',
  'Gris': '#6B7280',
  'Gris foncé': '#4B5563',
  'Rouge': '#DC2626',
  'Bleu': '#2563EB',
  'Vert': '#16A34A',
  'Marron': '#78350F',
  'Beige': '#D4B896',
  'Or': '#FFD700',
  'Orange': '#F97316',
  'Jaune': '#EAB308',
  'Violet': '#7C3AED',
  'Rose': '#EC4899',
  'Champagne': '#F7E7CE',
  'Autre': '#808080',
  // Lowercase (actual Supabase values - for direct lookup)
  'white': '#FFFFFF',
  'black': '#1a1a1a',
  'silver': '#C0C0C0',
  'dark gray': '#4B5563',
  'red': '#DC2626',
  'blue': '#2563EB',
  'green': '#16A34A',
  'brown': '#78350F',
  'orange': '#F97316',
  'yellow': '#EAB308',
  'purple': '#7C3AED',
  'champagne': '#F7E7CE',
  'other': '#808080',
  // Uppercase fallback
  'White': '#FFFFFF',
  'Black': '#1a1a1a',
  'Silver': '#C0C0C0',
  'Gray': '#6B7280',
  'Grey': '#6B7280',
  'Red': '#DC2626',
  'Blue': '#2563EB',
  'Green': '#16A34A',
  'Brown': '#78350F',
  'Gold': '#FFD700',
  'Yellow': '#EAB308',
  'Purple': '#7C3AED',
  'Pink': '#EC4899',
};

/**
 * Hook to load filter options from Supabase
 */
export function useVehicleFilters(): VehicleFiltersData {
  const [data, setData] = useState<{
    brands: string[];
    modelsByBrand: Record<string, string[]>;
    transmissions: string[];
    fuelTypes: string[];
    driveTypes: string[];
    bodyTypes: string[];
    colors: string[];
    minYear: number;
    maxYear: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadFilters() {
      try {
        // Fetch distinct values for each filter field
        const [
          brandsResult,
          transmissionsResult,
          fuelTypesResult,
          driveTypesResult,
          bodyTypesResult,
          colorsResult,
          yearsResult,
        ] = await Promise.all([
          supabase.from('vehicles').select('make, model').not('make', 'is', null),
          supabase.from('vehicles').select('transmission').not('transmission', 'is', null),
          supabase.from('vehicles').select('fuel_type').not('fuel_type', 'is', null),
          supabase.from('vehicles').select('drive_type').not('drive_type', 'is', null),
          supabase.from('vehicles').select('body_type').not('body_type', 'is', null),
          supabase.from('vehicles').select('color').not('color', 'is', null),
          supabase.from('vehicles').select('year').not('year', 'is', null),
        ]);

        // Process brands and models
        const brandModelMap: Record<string, Set<string>> = {};
        if (brandsResult.data) {
          for (const row of brandsResult.data) {
            if (row.make) {
              if (!brandModelMap[row.make]) {
                brandModelMap[row.make] = new Set();
              }
              if (row.model) {
                brandModelMap[row.make].add(row.model);
              }
            }
          }
        }

        const brands = Object.keys(brandModelMap).sort();
        const modelsByBrand: Record<string, string[]> = {};
        for (const [brand, models] of Object.entries(brandModelMap)) {
          modelsByBrand[brand] = Array.from(models).sort();
        }

        // Extract unique values with proper type narrowing
        const transmissions = [...new Set(transmissionsResult.data?.map(r => r.transmission).filter((v): v is string => !!v) || [])];
        const fuelTypes = [...new Set(fuelTypesResult.data?.map(r => r.fuel_type).filter((v): v is string => !!v) || [])];
        const driveTypes = [...new Set(driveTypesResult.data?.map(r => r.drive_type).filter((v): v is string => !!v) || [])];
        const bodyTypes = [...new Set(bodyTypesResult.data?.map(r => r.body_type).filter((v): v is string => !!v) || [])];
        const colors = [...new Set(colorsResult.data?.map(r => r.color).filter((v): v is string => !!v) || [])];

        // Get year range
        const years = yearsResult.data?.map(r => r.year).filter((y): y is number => y !== null && y !== undefined) || [];
        const minYear = years.length > 0 ? Math.min(...years) : 2000;
        const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

        setData({
          brands,
          modelsByBrand,
          transmissions,
          fuelTypes,
          driveTypes,
          bodyTypes,
          colors,
          minYear,
          maxYear,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load filters');
      } finally {
        setIsLoading(false);
      }
    }

    loadFilters();
  }, []);

  return useMemo(() => ({
    brands: data?.brands || [],
    models: data?.modelsByBrand || {},
    transmissionTypes: data?.transmissions || [],
    fuelTypes: data?.fuelTypes || [],
    driveTypes: data?.driveTypes || [],
    bodyTypes: data?.bodyTypes || [],
    colors: data?.colors || [],
    years: {
      min: data?.minYear || 2000,
      max: data?.maxYear || new Date().getFullYear(),
    },
    isLoading,
    error,
  }), [data, isLoading, error]);
}

/**
 * Get French translation for filter value
 */
export function translateFilter(
  type: 'transmission' | 'fuel' | 'drive' | 'body' | 'color',
  value: string
): string {
  switch (type) {
    case 'transmission':
      return TRANSMISSION_FR[value] || value;
    case 'fuel':
      return FUEL_TYPE_FR[value] || value;
    case 'drive':
      return DRIVE_TYPE_FR[value] || value;
    case 'body':
      return BODY_TYPE_FR[value] || value;
    case 'color':
      return COLOR_FR[value] || value;
    default:
      return value;
  }
}

/**
 * Get hex color for display
 */
export function getColorHex(colorName: string): string {
  // Try French translation first
  const frenchName = COLOR_FR[colorName] || colorName;
  return COLOR_HEX[frenchName] || COLOR_HEX[colorName] || '#808080';
}
