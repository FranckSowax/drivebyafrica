'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useFilterStore } from '@/store/useFilterStore';
import { useVehicleFilters, translateFilter } from '@/lib/hooks/useVehicleFilters';
import { cn } from '@/lib/utils';
import type { VehicleSource } from '@/types/vehicle';

// Dropdown Component for Filter Bar
interface FilterDropdownProps {
  label: string;
  value?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
  className?: string;
}

function FilterDropdown({
  label,
  value,
  placeholder = 'Tous',
  options,
  onChange,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition-all duration-200 min-w-[140px]',
          'bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
          isOpen
            ? 'border-mandarin ring-2 ring-mandarin/20'
            : value
            ? 'border-mandarin/50'
            : 'border-[var(--card-border)]'
        )}
      >
        <div className="text-left">
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
          <p className={cn(
            'text-sm font-medium truncate',
            value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
          )}>
            {displayValue}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full min-w-[180px] py-2 mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Clear option */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
            >
              <X className="w-4 h-4" />
              Effacer
            </button>
          )}

          {options.map((option) => {
            const isSelected = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  isSelected
                    ? 'bg-mandarin/10 text-mandarin'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface)]'
                )}
              >
                <span className="flex-1 text-left">{option.label}</span>
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
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

export function SearchFilterBar() {
  const router = useRouter();
  const { filters, setFilters, resetFilters } = useFilterStore();
  const vehicleFilters = useVehicleFilters();
  const [electricOnly, setElectricOnly] = useState(filters.fuelType === 'electric');

  // Build brand options from Supabase data
  const brandOptions = useMemo(() =>
    vehicleFilters.brands.map(brand => ({ value: brand, label: brand })),
    [vehicleFilters.brands]
  );

  // Build transmission options
  const transmissionOptions = useMemo(() =>
    vehicleFilters.transmissionTypes.map(t => ({
      value: t,
      label: translateFilter('transmission', t),
    })),
    [vehicleFilters.transmissionTypes]
  );

  // Handle electric toggle
  const handleElectricToggle = () => {
    const newValue = !electricOnly;
    setElectricOnly(newValue);
    setFilters({ fuelType: newValue ? 'electric' : undefined });
  };

  // Handle search
  const handleSearch = () => {
    router.push('/cars');
  };

  // Handle reset
  const handleReset = () => {
    resetFilters();
    setElectricOnly(false);
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    (filters.makes && filters.makes.length > 0) ||
    filters.priceTo !== 50000 ||
    filters.yearFrom !== 2015 ||
    filters.mileageMax !== 150000 ||
    filters.transmission ||
    filters.source !== 'all' ||
    electricOnly
  );

  return (
    <div className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-lg overflow-hidden">
      {/* Main Filter Row */}
      <div className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end gap-3">
          {/* Brand */}
          <FilterDropdown
            label="Marque"
            value={filters.makes?.[0]}
            placeholder="Toutes"
            options={brandOptions}
            onChange={(val) => setFilters({ makes: val ? [val] : [] })}
            className="flex-1 min-w-[140px]"
          />

          {/* Max Price */}
          <FilterDropdown
            label="Prix max"
            value={filters.priceTo?.toString()}
            placeholder="Tous"
            options={PRICE_OPTIONS}
            onChange={(val) => setFilters({ priceTo: val ? parseInt(val) : 50000 })}
            className="flex-1 min-w-[140px]"
          />

          {/* Min Year */}
          <FilterDropdown
            label="Année min"
            value={filters.yearFrom?.toString()}
            placeholder="Toutes"
            options={YEAR_OPTIONS}
            onChange={(val) => setFilters({ yearFrom: val ? parseInt(val) : 2015 })}
            className="flex-1 min-w-[120px]"
          />

          {/* Max Mileage */}
          <FilterDropdown
            label="Km max"
            value={filters.mileageMax?.toString()}
            placeholder="Tous"
            options={MILEAGE_OPTIONS}
            onChange={(val) => setFilters({ mileageMax: val ? parseInt(val) : 150000 })}
            className="flex-1 min-w-[120px]"
          />

          {/* Transmission */}
          <FilterDropdown
            label="Transmission"
            value={filters.transmission}
            placeholder="Toutes"
            options={transmissionOptions}
            onChange={(val) => setFilters({ transmission: val })}
            className="flex-1 min-w-[140px]"
          />

          {/* Source/Country */}
          <FilterDropdown
            label="Pays"
            value={filters.source === 'all' ? undefined : filters.source}
            placeholder="Tous"
            options={SOURCE_OPTIONS}
            onChange={(val) => setFilters({ source: (val as VehicleSource) || 'all' })}
            className="flex-1 min-w-[140px]"
          />

          {/* Search Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleSearch}
            className="h-[62px] px-8"
          >
            <Search className="w-5 h-5 mr-2" />
            Rechercher
          </Button>
        </div>
      </div>

      {/* Secondary Row */}
      <div className="px-4 lg:px-6 pb-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--card-border)] pt-4">
        {/* Left Side: Electric Toggle */}
        <button
          type="button"
          onClick={handleElectricToggle}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200',
            electricOnly
              ? 'bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400'
              : 'bg-[var(--surface)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-green-500/50'
          )}
        >
          <Zap className={cn('w-4 h-4', electricOnly && 'fill-current')} />
          <span className="text-sm font-medium">Voitures électriques</span>
        </button>

        {/* Right Side: Reset and More Filters */}
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-muted)] hover:text-mandarin transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/cars')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-mandarin border border-[var(--card-border)] rounded-full hover:border-mandarin/50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Plus de filtres
          </button>
        </div>
      </div>
    </div>
  );
}
