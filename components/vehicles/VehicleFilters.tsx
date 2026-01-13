'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  ChevronDown,
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { useFilterStore } from '@/store/useFilterStore';
import { useDongchediFilters, getFilterLabel, getColorHex } from '@/lib/hooks/useDongchediFilters';
import { cn } from '@/lib/utils';

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
}

function FilterDropdown({
  label,
  icon,
  value,
  placeholder = 'Selectionner',
  options,
  onChange,
  multiple = false,
  selectedValues = [],
  onMultiChange,
  isLoading = false,
  searchable = false,
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
      ? `${selectedValues.length} selectionne${selectedValues.length > 1 ? 's' : ''}`
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
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[var(--text-muted)] transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                Effacer la selection
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                Aucun resultat
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
  const hasCustomRange = value[0] !== min || value[1] !== max;

  return (
    <div className={cn(
      'p-4 rounded-xl border transition-colors',
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
            {formatValue(value[0])} - {formatValue(value[1])}
          </p>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onChange}
        formatValue={formatValue}
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
  const dongchediFilters = useDongchediFilters();
  const currentYear = new Date().getFullYear();

  // Build options from API data
  const brandOptions = useMemo(() =>
    dongchediFilters.brands.map(brand => ({ value: brand, label: brand })),
    [dongchediFilters.brands]
  );

  const modelOptions = useMemo(() => {
    if (!filters.makes || filters.makes.length === 0) return [];
    const models: string[] = [];
    for (const make of filters.makes) {
      const makeModels = dongchediFilters.models[make] || [];
      models.push(...makeModels);
    }
    return [...new Set(models)].sort().map(model => ({ value: model, label: model }));
  }, [filters.makes, dongchediFilters.models]);

  const transmissionOptions = useMemo(() =>
    dongchediFilters.transmissionTypes.map(t => ({
      value: t,
      label: getFilterLabel('transmission', t),
    })),
    [dongchediFilters.transmissionTypes]
  );

  const bodyTypeOptions = useMemo(() =>
    dongchediFilters.bodyTypes.map(b => ({
      value: b,
      label: getFilterLabel('body', b),
    })),
    [dongchediFilters.bodyTypes]
  );

  const engineTypeOptions = useMemo(() =>
    dongchediFilters.engineTypes.map(e => ({
      value: e,
      label: getFilterLabel('engine', e),
    })),
    [dongchediFilters.engineTypes]
  );

  const driveTypeOptions = useMemo(() =>
    dongchediFilters.driveTypes.map(d => ({
      value: d,
      label: getFilterLabel('drive', d),
    })),
    [dongchediFilters.driveTypes]
  );

  const colorOptions = useMemo(() =>
    dongchediFilters.colors.map(c => ({
      value: c,
      label: getFilterLabel('color', c),
      color: getColorHex(c),
    })),
    [dongchediFilters.colors]
  );

  // Count active filters
  const activeFiltersCount = [
    filters.makes && filters.makes.length > 0,
    filters.models && filters.models.length > 0,
    filters.yearFrom !== 2015 || filters.yearTo !== currentYear,
    filters.priceFrom !== 0 || filters.priceTo !== 50000,
    filters.mileageMax !== 150000,
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
        label: filters.models.length === 1 ? filters.models[0] : `${filters.models.length} modeles`,
        onClear: () => setFilters({ models: [] }),
      });
    }

    if (filters.transmission) {
      badges.push({
        label: getFilterLabel('transmission', filters.transmission),
        onClear: () => setFilters({ transmission: undefined }),
      });
    }

    if (filters.fuelType) {
      badges.push({
        label: getFilterLabel('engine', filters.fuelType),
        onClear: () => setFilters({ fuelType: undefined }),
      });
    }

    if (filters.driveType) {
      badges.push({
        label: getFilterLabel('drive', filters.driveType),
        onClear: () => setFilters({ driveType: undefined }),
      });
    }

    if (filters.bodyType) {
      badges.push({
        label: getFilterLabel('body', filters.bodyType),
        onClear: () => setFilters({ bodyType: undefined }),
      });
    }

    if (filters.color) {
      badges.push({
        label: getFilterLabel('color', filters.color),
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
              Reinitialiser
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
          onMultiChange={(values) => setFilters({ makes: values, models: [] })}
          isLoading={dongchediFilters.isLoading}
          searchable
        />

        {/* Models - Multi Select (only if makes are selected) */}
        {filters.makes && filters.makes.length > 0 && modelOptions.length > 0 && (
          <FilterDropdown
            label="Modele"
            icon={<Car className="w-4 h-4" />}
            placeholder="Tous modeles"
            options={modelOptions}
            onChange={() => {}}
            multiple
            selectedValues={filters.models || []}
            onMultiChange={(values) => setFilters({ models: values })}
            searchable
          />
        )}

        {/* Body Type */}
        <FilterDropdown
          label="Carrosserie"
          icon={<Tag className="w-4 h-4" />}
          value={filters.bodyType}
          placeholder="Tous types"
          options={bodyTypeOptions}
          onChange={(val) => setFilters({ bodyType: val })}
          isLoading={dongchediFilters.isLoading}
        />

        {/* Year Range */}
        <RangeFilter
          label="Annee"
          icon={<Calendar className="w-4 h-4" />}
          min={2000}
          max={currentYear}
          value={[filters.yearFrom || 2015, filters.yearTo || currentYear]}
          onChange={([from, to]) => setFilters({ yearFrom: from, yearTo: to })}
          formatValue={(val) => val.toString()}
        />

        {/* Price Range (USD) */}
        <RangeFilter
          label="Prix (USD)"
          icon={<DollarSign className="w-4 h-4" />}
          min={0}
          max={100000}
          step={1000}
          value={[filters.priceFrom || 0, filters.priceTo || 50000]}
          onChange={([from, to]) => setFilters({ priceFrom: from, priceTo: to })}
          formatValue={(val) => `$${val.toLocaleString()}`}
        />

        {/* Mileage Range */}
        <RangeFilter
          label="Kilometrage"
          icon={<Gauge className="w-4 h-4" />}
          min={0}
          max={200000}
          step={5000}
          value={[0, filters.mileageMax || 150000]}
          onChange={([, max]) => setFilters({ mileageMax: max })}
          formatValue={(val) => `${val.toLocaleString()} km`}
        />

        {/* Transmission */}
        <FilterDropdown
          label="Boite de vitesse"
          icon={<Cog className="w-4 h-4" />}
          value={filters.transmission}
          placeholder="Toutes"
          options={transmissionOptions}
          onChange={(val) => setFilters({ transmission: val })}
          isLoading={dongchediFilters.isLoading}
        />

        {/* Fuel Type (Engine Type) */}
        <FilterDropdown
          label="Carburant"
          icon={<Fuel className="w-4 h-4" />}
          value={filters.fuelType}
          placeholder="Tous"
          options={engineTypeOptions}
          onChange={(val) => setFilters({ fuelType: val })}
          isLoading={dongchediFilters.isLoading}
        />

        {/* Drive Type */}
        <FilterDropdown
          label="Transmission"
          icon={<Compass className="w-4 h-4" />}
          value={filters.driveType}
          placeholder="Toutes"
          options={driveTypeOptions}
          onChange={(val) => setFilters({ driveType: val })}
          isLoading={dongchediFilters.isLoading}
        />

        {/* Color */}
        <FilterDropdown
          label="Couleur"
          icon={<Palette className="w-4 h-4" />}
          value={filters.color}
          placeholder="Toutes couleurs"
          options={colorOptions}
          onChange={(val) => setFilters({ color: val })}
          isLoading={dongchediFilters.isLoading}
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
