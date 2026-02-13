'use client';

import { useState, useRef, useEffect, useMemo, useCallback, startTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Car,
  Calendar,
  DollarSign,
  Gauge,
  Cog,
  Fuel,
  Compass,
  Palette,
  Tag,
  Filter,
  Loader2,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { useFilterStore } from '@/store/useFilterStore';
import { useVehicleFilters, translateFilter, getColorHex } from '@/lib/hooks/useVehicleFilters';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/utils';
import type { VehicleSource } from '@/types/vehicle';

// Source/Country options
const SOURCE_OPTIONS = [
  { value: 'korea', label: 'Corée du Sud', icon: <span className="text-base">🇰🇷</span> },
  { value: 'china', label: 'Chine', icon: <span className="text-base">🇨🇳</span> },
  { value: 'dubai', label: 'Dubaï', icon: <span className="text-base">🇦🇪</span> },
];

// Modern Dropdown Component
interface DropdownProps {
  label: string;
  icon: React.ReactNode;
  value?: string;
  placeholder?: string;
  options: { value: string; label: string; icon?: React.ReactNode; color?: string }[];
  onChange: (value: string | undefined) => void;
  multiple?: boolean;
  selectedValues?: string[];
  onMultiChange?: (values: string[]) => void;
  isLoading?: boolean;
  searchable?: boolean;
  openUpward?: boolean;
}

function FilterDropdown({
  label,
  icon,
  value,
  placeholder = 'Sélectionner',
  options,
  onChange,
  multiple = false,
  selectedValues = [],
  onMultiChange,
  isLoading = false,
  searchable = false,
  openUpward = false,
}: DropdownProps) {
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
    const term = searchTerm.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(term) ||
      opt.value.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectedOption = options.find((opt) => opt.value === value);
  const hasSelection = multiple ? selectedValues.length > 0 : !!value;

  const displayValue = multiple
    ? selectedValues.length > 0
      ? `${selectedValues.length} sélectionné${selectedValues.length > 1 ? 's' : ''}`
      : placeholder
    : selectedOption?.label || placeholder;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
          'bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
          isLoading && 'opacity-50 cursor-wait',
          isOpen
            ? 'border-mandarin ring-2 ring-mandarin/20'
            : hasSelection
            ? 'border-mandarin/50'
            : 'border-[var(--card-border)]'
        )}
      >
        <span className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          hasSelection ? 'bg-mandarin/10 text-mandarin' : 'bg-[var(--card-border)] text-[var(--text-muted)]'
        )}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        </span>
        <div className="flex-1 text-left">
          <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
          <p className={cn(
            'text-sm font-medium truncate',
            hasSelection ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
          )}>
            {displayValue}
          </p>
        </div>
        {openUpward ? (
          <ChevronUp
            className={cn(
              'w-4 h-4 text-[var(--text-muted)] transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        ) : (
          <ChevronDown
            className={cn(
              'w-4 h-4 text-[var(--text-muted)] transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          'absolute z-50 w-full py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl max-h-72 overflow-hidden',
          openUpward
            ? 'bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200'
            : 'top-full mt-2 animate-in fade-in slide-in-from-top-2 duration-200'
        )}>
          {/* Search input for searchable dropdowns */}
          {searchable && options.length > 10 && (
            <div className="px-3 pb-2 border-b border-[var(--card-border)]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-mandarin"
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-56">
            {/* Clear option for single select */}
            {!multiple && value && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
              >
                <X className="w-4 h-4" />
                Effacer la sélection
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                Aucun résultat
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = multiple
                  ? selectedValues.includes(option.value)
                  : value === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (multiple && onMultiChange) {
                        const newValues = isSelected
                          ? selectedValues.filter((v) => v !== option.value)
                          : [...selectedValues, option.value];
                        onMultiChange(newValues);
                      } else {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      isSelected
                        ? 'bg-mandarin/10 text-mandarin'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface)]'
                    )}
                  >
                    {option.color && (
                      <span
                        className="w-4 h-4 rounded-full border border-[var(--card-border)] flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.icon}
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

// Range Slider Section
interface RangeFilterProps {
  label: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue: (val: number) => string;
}

function RangeFilter({ label, icon, min, max, step = 1, value, onChange, formatValue }: RangeFilterProps) {
  // Local state for live display during drag
  const [displayValue, setDisplayValue] = useState<[number, number]>(value);

  // Sync display value with prop when not dragging
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const hasCustomRange = useMemo(() =>
    displayValue[0] !== min || displayValue[1] !== max,
    [displayValue, min, max]
  );

  return (
    <div className={cn(
      'p-4 rounded-xl border',
      hasCustomRange
        ? 'bg-mandarin/5 border-mandarin/30'
        : 'bg-[var(--surface)] border-[var(--card-border)]'
    )}>
      <div className="flex items-center gap-3 mb-4">
        <span className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          hasCustomRange ? 'bg-mandarin/10 text-mandarin' : 'bg-[var(--card-border)] text-[var(--text-muted)]'
        )}>
          {icon}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {formatValue(displayValue[0])} - {formatValue(displayValue[1])}
          </p>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onChange}
        onLiveChange={setDisplayValue}
      />
    </div>
  );
}

// Active Filter Badge
function ActiveFilterBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mandarin/10 text-mandarin text-xs font-medium rounded-full">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="w-4 h-4 rounded-full bg-mandarin/20 hover:bg-mandarin/30 flex items-center justify-center transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// Main Component
interface VehicleFiltersProps {
  onApply?: () => void;
  className?: string;
}

export function VehicleFilters({ onApply, className }: VehicleFiltersProps) {
  const { filters, setFilters, resetFilters } = useFilterStore();
  const vehicleFilters = useVehicleFilters();
  const { currencyInfo, formatPrice } = useCurrency();
  const currentYear = new Date().getFullYear();

  // Debounced setFilters for multi-select changes (makes, models)
  // Prevents firing an API call for each individual selection
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFiltersDebounced = useCallback((updates: Parameters<typeof setFilters>[0]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        setFilters(updates);
      });
    }, 500);
  }, [setFilters]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Price filter constants (in USD)
  const PRICE_MIN_USD = 0;
  const PRICE_MAX_USD = 200000;
  const MILEAGE_MIN = 0;
  const MILEAGE_MAX = 500000;

  // Format price for filter display using selected currency
  const formatPriceShort = useCallback((amountUsd: number): string => {
    const rate = currencyInfo?.rateToUsd || 1;
    const converted = amountUsd * rate;
    const code = currencyInfo?.code || 'USD';

    // Format number with K/M suffix
    const formatShort = (n: number): string => {
      if (n >= 1000000) {
        return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
      }
      if (n >= 1000) {
        return `${(n / 1000).toFixed(0)}K`;
      }
      return n.toString();
    };

    // Add currency symbol/suffix
    if (code === 'XAF' || code === 'XOF') {
      return `${formatShort(converted)} FCFA`;
    }
    if (code === 'EUR') {
      return `${formatShort(converted)} €`;
    }
    if (code === 'USD') {
      return `$${formatShort(converted)}`;
    }
    return `${currencyInfo?.symbol || '$'}${formatShort(converted)}`;
  }, [currencyInfo]);

  // Get currency label for filter section
  const currencyLabel = useMemo(() => {
    const code = currencyInfo?.code || 'USD';
    if (code === 'XAF' || code === 'XOF') return 'FCFA';
    return code;
  }, [currencyInfo]);

  // Build options from Supabase data
  const brandOptions = useMemo(() =>
    vehicleFilters.brands.map(brand => ({ value: brand, label: brand })),
    [vehicleFilters.brands]
  );

  // Fetch models dynamically when makes are selected
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['vehicleModels', filters.makes],
    queryFn: async () => {
      if (!filters.makes || filters.makes.length === 0) return {};
      const response = await fetch(`/api/vehicles/models?makes=${filters.makes.join(',')}`);
      if (!response.ok) return {};
      const data = await response.json();
      return data.models as Record<string, string[]>;
    },
    enabled: !!filters.makes && filters.makes.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const modelOptions = useMemo(() => {
    if (!filters.makes || filters.makes.length === 0 || !modelsData) return [];
    const models: string[] = [];
    for (const make of filters.makes) {
      const makeModels = modelsData[make] || [];
      models.push(...makeModels);
    }
    return [...new Set(models)].sort().map(model => ({ value: model, label: model }));
  }, [filters.makes, modelsData]);

  const transmissionOptions = useMemo(() =>
    vehicleFilters.transmissionTypes.map(t => ({
      value: t,
      label: translateFilter('transmission', t),
    })),
    [vehicleFilters.transmissionTypes]
  );

  const bodyTypeOptions = useMemo(() =>
    vehicleFilters.bodyTypes.map(b => ({
      value: b,
      label: translateFilter('body', b),
    })),
    [vehicleFilters.bodyTypes]
  );

  const fuelTypeOptions = useMemo(() =>
    vehicleFilters.fuelTypes.map(f => ({
      value: f,
      label: translateFilter('fuel', f),
    })),
    [vehicleFilters.fuelTypes]
  );

  const driveTypeOptions = useMemo(() =>
    vehicleFilters.driveTypes.map(d => ({
      value: d,
      label: translateFilter('drive', d),
    })),
    [vehicleFilters.driveTypes]
  );

  const colorOptions = useMemo(() =>
    vehicleFilters.colors.map(c => ({
      value: c,
      label: translateFilter('color', c),
      color: getColorHex(c),
    })),
    [vehicleFilters.colors]
  );

  // Count active filters
  const activeFiltersCount = [
    filters.makes && filters.makes.length > 0,
    filters.models && filters.models.length > 0,
    filters.source && filters.source !== 'all',
    filters.yearFrom !== undefined || filters.yearTo !== undefined,
    filters.priceFrom !== undefined || filters.priceTo !== undefined,
    filters.mileageMax !== undefined,
    filters.transmission,
    filters.fuelType,
    filters.driveType,
    filters.bodyType,
    filters.color,
  ].filter(Boolean).length;

  // Get active filter badges
  const getActiveFilterBadges = () => {
    const badges: { label: string; onClear: () => void }[] = [];

    if (filters.makes && filters.makes.length > 0) {
      badges.push({
        label: filters.makes.length === 1 ? filters.makes[0] : `${filters.makes.length} marques`,
        onClear: () => setFilters({ makes: [], models: [] }),
      });
    }

    if (filters.models && filters.models.length > 0) {
      badges.push({
        label: filters.models.length === 1 ? filters.models[0] : `${filters.models.length} modèles`,
        onClear: () => setFilters({ models: [] }),
      });
    }

    if (filters.source && filters.source !== 'all') {
      const sourceLabels: Record<string, string> = {
        korea: 'Corée du Sud',
        china: 'Chine',
        dubai: 'Dubaï',
      };
      badges.push({
        label: sourceLabels[filters.source] || filters.source,
        onClear: () => setFilters({ source: 'all' }),
      });
    }

    if (filters.transmission) {
      badges.push({
        label: translateFilter('transmission', filters.transmission),
        onClear: () => setFilters({ transmission: undefined }),
      });
    }

    if (filters.fuelType) {
      badges.push({
        label: translateFilter('fuel', filters.fuelType),
        onClear: () => setFilters({ fuelType: undefined }),
      });
    }

    if (filters.driveType) {
      badges.push({
        label: translateFilter('drive', filters.driveType),
        onClear: () => setFilters({ driveType: undefined }),
      });
    }

    if (filters.bodyType) {
      badges.push({
        label: translateFilter('body', filters.bodyType),
        onClear: () => setFilters({ bodyType: undefined }),
      });
    }

    if (filters.color) {
      badges.push({
        label: translateFilter('color', filters.color),
        onClear: () => setFilters({ color: undefined }),
      });
    }

    return badges;
  };

  const activeBadges = getActiveFilterBadges();

  return (
    <div className={cn('bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-mandarin/5 to-transparent border-b border-[var(--card-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mandarin/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-mandarin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Filtres</h2>
              {activeFiltersCount > 0 && (
                <p className="text-xs text-mandarin">{activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-mandarin hover:bg-mandarin/5 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Active Filter Badges */}
        {activeBadges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeBadges.map((badge, index) => (
              <ActiveFilterBadge key={index} label={badge.label} onClear={badge.onClear} />
            ))}
          </div>
        )}
      </div>

      {/* Filters Content */}
      <div className="p-5 space-y-4">
        {/* Makes - Multi Select */}
        <FilterDropdown
          label="Marque"
          icon={<Car className="w-4 h-4" />}
          placeholder="Toutes marques"
          options={brandOptions}
          onChange={() => {}}
          multiple
          selectedValues={filters.makes || []}
          onMultiChange={(values) => setFiltersDebounced({ makes: values, models: [] })}
          isLoading={vehicleFilters.isLoading}
          searchable
        />

        {/* Models - Multi Select (only if makes are selected) */}
        {filters.makes && filters.makes.length > 0 && (modelsLoading || modelOptions.length > 0) && (
          <FilterDropdown
            label="Modèle"
            icon={<Car className="w-4 h-4" />}
            placeholder="Tous modèles"
            options={modelOptions}
            onChange={() => {}}
            multiple
            selectedValues={filters.models || []}
            onMultiChange={(values) => setFiltersDebounced({ models: values })}
            isLoading={modelsLoading}
            searchable
          />
        )}

        {/* Source/Country */}
        <FilterDropdown
          label="Pays d'origine"
          icon={<Globe className="w-4 h-4" />}
          value={filters.source === 'all' ? undefined : filters.source}
          placeholder="Tous pays"
          options={SOURCE_OPTIONS}
          onChange={(val) => setFilters({ source: (val as VehicleSource) || 'all' })}
        />

        {/* Body Type */}
        <FilterDropdown
          label="Carrosserie"
          icon={<Tag className="w-4 h-4" />}
          value={filters.bodyType}
          placeholder="Tous types"
          options={bodyTypeOptions}
          onChange={(val) => setFilters({ bodyType: val })}
          isLoading={vehicleFilters.isLoading}
        />

        {/* Year Range */}
        <RangeFilter
          label="Année"
          icon={<Calendar className="w-4 h-4" />}
          min={2000}
          max={currentYear}
          value={[filters.yearFrom || 2000, filters.yearTo || currentYear]}
          onChange={([from, to]) => setFilters({ yearFrom: from, yearTo: to })}
          formatValue={(val) => val.toString()}
        />

        {/* Price Range */}
        <RangeFilter
          label={`Prix (${currencyLabel})`}
          icon={<DollarSign className="w-4 h-4" />}
          min={PRICE_MIN_USD}
          max={PRICE_MAX_USD}
          step={1000}
          value={[filters.priceFrom ?? PRICE_MIN_USD, filters.priceTo ?? PRICE_MAX_USD]}
          onChange={([from, to]) => {
            // Only set filter if different from defaults
            const newPriceFrom = from === PRICE_MIN_USD ? undefined : from;
            const newPriceTo = to === PRICE_MAX_USD ? undefined : to;
            setFilters({ priceFrom: newPriceFrom, priceTo: newPriceTo });
          }}
          formatValue={formatPriceShort}
        />

        {/* Mileage Range */}
        <RangeFilter
          label="Kilométrage"
          icon={<Gauge className="w-4 h-4" />}
          min={MILEAGE_MIN}
          max={MILEAGE_MAX}
          step={5000}
          value={[MILEAGE_MIN, filters.mileageMax ?? MILEAGE_MAX]}
          onChange={([, max]) => {
            // Only set filter if different from default
            const newMileageMax = max === MILEAGE_MAX ? undefined : max;
            setFilters({ mileageMax: newMileageMax });
          }}
          formatValue={(val) => `${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} km`}
        />

        {/* Transmission */}
        <FilterDropdown
          label="Boîte de vitesse"
          icon={<Cog className="w-4 h-4" />}
          value={filters.transmission}
          placeholder="Toutes"
          options={transmissionOptions}
          onChange={(val) => setFilters({ transmission: val })}
          isLoading={vehicleFilters.isLoading}
        />

        {/* Fuel Type */}
        <FilterDropdown
          label="Carburant"
          icon={<Fuel className="w-4 h-4" />}
          value={filters.fuelType}
          placeholder="Tous"
          options={fuelTypeOptions}
          onChange={(val) => setFilters({ fuelType: val })}
          isLoading={vehicleFilters.isLoading}
        />

        {/* Drive Type */}
        <FilterDropdown
          label="Transmission"
          icon={<Compass className="w-4 h-4" />}
          value={filters.driveType}
          placeholder="Toutes"
          options={driveTypeOptions}
          onChange={(val) => setFilters({ driveType: val })}
          isLoading={vehicleFilters.isLoading}
        />

        {/* Color - opens upward */}
        <FilterDropdown
          label="Couleur"
          icon={<Palette className="w-4 h-4" />}
          value={filters.color}
          placeholder="Toutes couleurs"
          options={colorOptions}
          onChange={(val) => setFilters({ color: val })}
          isLoading={vehicleFilters.isLoading}
          openUpward
        />
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-4 bg-[var(--surface)] border-t border-[var(--card-border)]">
        <Button
          variant="primary"
          className="w-full h-12 text-base font-semibold"
          onClick={onApply}
        >
          Appliquer les filtres
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
