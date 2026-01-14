'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
  X,
  Loader2,
  Car,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useFilterStore } from '@/store/useFilterStore';
import { useVehicleFilters, translateFilter } from '@/lib/hooks/useVehicleFilters';
import { useVehicles } from '@/lib/hooks/useVehicles';
import { cn } from '@/lib/utils';
import type { VehicleSource } from '@/types/vehicle';

// Fallback brands - Korean, Chinese and popular international brands
const FALLBACK_BRANDS = [
  // Korean brands
  'Hyundai', 'Kia', 'Genesis', 'SsangYong', 'Samsung (Renault)',
  // Chinese brands
  'BYD', 'Geely', 'Chery', 'Great Wall', 'Haval', 'MG', 'NIO', 'XPeng', 'Li Auto', 'Zeekr', 'Lynk & Co', 'Changan', 'GAC', 'Dongfeng', 'JAC', 'BAIC',
  // Japanese brands (popular in Korea)
  'Toyota', 'Honda', 'Nissan', 'Mazda', 'Lexus',
  // European brands
  'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Porsche', 'Land Rover'
];

// Fallback transmissions
const FALLBACK_TRANSMISSIONS = [
  { value: 'automatic', label: 'Automatique' },
  { value: 'manual', label: 'Manuelle' },
];

// Dropdown Component for Filter Bar
interface FilterDropdownProps {
  label: string;
  value?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
  className?: string;
  isLoading?: boolean;
}

function FilterDropdown({
  label,
  value,
  placeholder = 'Tous',
  options,
  onChange,
  className,
  isLoading = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;
  const showSearch = options.length > 8;

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl border transition-all duration-200 min-w-[140px] w-full h-[58px]',
          'bg-white dark:bg-[var(--surface)] hover:shadow-md',
          isLoading && 'opacity-60 cursor-wait',
          isOpen
            ? 'border-mandarin shadow-lg shadow-mandarin/10'
            : value
            ? 'border-mandarin/50 shadow-sm'
            : 'border-gray-200 dark:border-[var(--card-border)] shadow-sm'
        )}
      >
        <div className="text-left flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[var(--text-muted)] font-medium">{label}</p>
          <p className={cn(
            'text-sm font-semibold truncate',
            value ? 'text-gray-900 dark:text-[var(--text-primary)]' : 'text-gray-400 dark:text-[var(--text-muted)]'
          )}>
            {isLoading ? 'Chargement...' : displayValue}
          </p>
        </div>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0',
              isOpen && 'rotate-180 text-mandarin'
            )}
          />
        )}
      </button>

      {/* Dropdown Menu - Opens upward */}
      {isOpen && !isLoading && (
        <div className="absolute z-50 w-full min-w-[200px] py-2 bottom-full mb-2 bg-white dark:bg-[var(--card-bg)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl shadow-2xl max-h-72 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Search input */}
          {showSearch && (
            <div className="px-3 pb-2 border-b border-gray-100 dark:border-[var(--card-border)]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[var(--surface)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg focus:outline-none focus:border-mandarin focus:ring-2 focus:ring-mandarin/20"
                autoFocus
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-56">
            {/* Clear option */}
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-[var(--surface)] transition-colors"
              >
                <X className="w-4 h-4" />
                Effacer
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                Aucun résultat
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      isSelected
                        ? 'bg-mandarin/10 text-mandarin font-medium'
                        : 'text-gray-700 dark:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-[var(--surface)]'
                    )}
                  >
                    <span className="flex-1 text-left">{option.label}</span>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Source/Country options
const SOURCE_OPTIONS = [
  { value: 'korea', label: 'Corée du Sud' },
  { value: 'china', label: 'Chine' },
  { value: 'dubai', label: 'Dubaï' },
];

// Price options
const PRICE_OPTIONS = [
  { value: '5000', label: '5 000 USD' },
  { value: '10000', label: '10 000 USD' },
  { value: '15000', label: '15 000 USD' },
  { value: '20000', label: '20 000 USD' },
  { value: '30000', label: '30 000 USD' },
  { value: '50000', label: '50 000 USD' },
  { value: '100000', label: '100 000 USD' },
];

// Year options
const YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 2010; year--) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  return years;
})();

// Mileage options
const MILEAGE_OPTIONS = [
  { value: '10000', label: '10 000 km' },
  { value: '30000', label: '30 000 km' },
  { value: '50000', label: '50 000 km' },
  { value: '80000', label: '80 000 km' },
  { value: '100000', label: '100 000 km' },
  { value: '150000', label: '150 000 km' },
  { value: '200000', label: '200 000 km' },
];

// Empty filters for total count
const EMPTY_FILTERS = {
  source: 'all' as const,
  makes: [],
  models: [],
  yearFrom: undefined,
  yearTo: undefined,
  priceFrom: undefined,
  priceTo: undefined,
  mileageMax: undefined,
  transmission: undefined,
  fuelType: undefined,
  driveType: undefined,
  color: undefined,
  bodyType: undefined,
};

export function SearchFilterBar() {
  const router = useRouter();
  const { filters, setFilters, resetFilters } = useFilterStore();
  const vehicleFilters = useVehicleFilters();

  // Get total vehicle count (no filters)
  const { totalCount: totalVehicles, isLoading: isTotalLoading } = useVehicles({
    filters: EMPTY_FILTERS,
    page: 1,
    limit: 1
  });

  // Get filtered vehicle count
  const { totalCount: filteredCount, isLoading: isFilteredLoading } = useVehicles({
    filters,
    page: 1,
    limit: 1
  });

  // Build brand options from Supabase data with fallback
  const brandOptions = useMemo(() => {
    if (vehicleFilters.brands.length > 0) {
      return vehicleFilters.brands.map(brand => ({ value: brand, label: brand }));
    }
    return FALLBACK_BRANDS.map(brand => ({ value: brand, label: brand }));
  }, [vehicleFilters.brands]);

  // Build transmission options with fallback
  const transmissionOptions = useMemo(() => {
    if (vehicleFilters.transmissionTypes.length > 0) {
      return vehicleFilters.transmissionTypes.map(t => ({
        value: t,
        label: translateFilter('transmission', t),
      }));
    }
    return FALLBACK_TRANSMISSIONS;
  }, [vehicleFilters.transmissionTypes]);

  // Handle search
  const handleSearch = () => {
    router.push('/cars');
  };

  // Handle view all
  const handleViewAll = () => {
    resetFilters();
    router.push('/cars');
  };

  // Handle reset
  const handleReset = () => {
    resetFilters();
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    (filters.makes && filters.makes.length > 0) ||
    filters.priceTo !== 50000 ||
    filters.yearFrom !== 2015 ||
    filters.mileageMax !== 150000 ||
    filters.transmission ||
    filters.source !== 'all'
  );

  // Format count for display
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace('.0', '')}k`;
    }
    return count.toLocaleString('fr-FR');
  };

  return (
    <div className="w-full">
      {/* Main Filter Card */}
      <div className="bg-white dark:bg-[var(--card-bg)] border border-gray-200 dark:border-[var(--card-border)] rounded-2xl shadow-xl overflow-visible">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--card-border)] bg-gradient-to-r from-gray-50 to-white dark:from-[var(--surface)] dark:to-[var(--card-bg)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mandarin/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-mandarin" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-[var(--text-primary)]">Recherche rapide</h3>
                <p className="text-xs text-gray-500 dark:text-[var(--text-muted)]">
                  {isTotalLoading ? 'Chargement...' : `${formatCount(totalVehicles)} véhicules disponibles`}
                </p>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-mandarin hover:bg-mandarin/5 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div className="p-4 lg:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Brand */}
            <FilterDropdown
              label="Marque"
              value={filters.makes?.[0]}
              placeholder="Toutes"
              options={brandOptions}
              onChange={(val) => setFilters({ makes: val ? [val] : [] })}
              isLoading={vehicleFilters.isLoading}
            />

            {/* Max Price */}
            <FilterDropdown
              label="Budget max"
              value={filters.priceTo?.toString()}
              placeholder="Tous"
              options={PRICE_OPTIONS}
              onChange={(val) => setFilters({ priceTo: val ? parseInt(val) : 50000 })}
            />

            {/* Min Year */}
            <FilterDropdown
              label="Année min"
              value={filters.yearFrom?.toString()}
              placeholder="Toutes"
              options={YEAR_OPTIONS}
              onChange={(val) => setFilters({ yearFrom: val ? parseInt(val) : 2015 })}
            />

            {/* Max Mileage */}
            <FilterDropdown
              label="Km max"
              value={filters.mileageMax?.toString()}
              placeholder="Tous"
              options={MILEAGE_OPTIONS}
              onChange={(val) => setFilters({ mileageMax: val ? parseInt(val) : 150000 })}
            />

            {/* Transmission */}
            <FilterDropdown
              label="Boîte"
              value={filters.transmission}
              placeholder="Toutes"
              options={transmissionOptions}
              onChange={(val) => setFilters({ transmission: val })}
              isLoading={vehicleFilters.isLoading}
            />

            {/* Source/Country */}
            <FilterDropdown
              label="Origine"
              value={filters.source === 'all' ? undefined : filters.source}
              placeholder="Tous"
              options={SOURCE_OPTIONS}
              onChange={(val) => setFilters({ source: (val as VehicleSource) || 'all' })}
            />
          </div>
        </div>

        {/* Action Row */}
        <div className="px-4 lg:px-5 pb-4 lg:pb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* View All Toggle */}
          <button
            type="button"
            onClick={handleViewAll}
            className="group flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-mandarin to-orange-500 hover:from-orange-500 hover:to-mandarin text-white font-semibold rounded-xl shadow-lg shadow-mandarin/25 hover:shadow-xl hover:shadow-mandarin/30 transition-all duration-300"
          >
            <Car className="w-5 h-5" />
            <span>Voir tous les véhicules</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Search and More Filters */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/cars')}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-[var(--text-secondary)] hover:text-mandarin border border-gray-200 dark:border-[var(--card-border)] rounded-xl hover:border-mandarin/50 hover:bg-mandarin/5 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Plus de filtres
            </button>

            <Button
              variant="primary"
              size="lg"
              onClick={handleSearch}
              className="h-[50px] px-6 shadow-lg shadow-mandarin/25"
            >
              {isFilteredLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  <span>Rechercher</span>
                  {filteredCount > 0 && (
                    <span className="ml-2 px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                      {formatCount(filteredCount)}
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
