'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  ChevronDown,
  Check,
  RotateCcw,
  MapPin,
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { useFilterStore } from '@/store/useFilterStore';
import { cn } from '@/lib/utils';
import type { VehicleSource, DriveType, VehicleColor, BodyType, VehicleStatus } from '@/types/vehicle';

// Filter options data
const SOURCES: { value: VehicleSource | 'all'; label: string; flag?: string }[] = [
  { value: 'all', label: 'Toutes origines' },
  { value: 'korea', label: 'Coree du Sud', flag: '🇰🇷' },
  { value: 'china', label: 'Chine', flag: '🇨🇳' },
  { value: 'dubai', label: 'Dubai', flag: '🇦🇪' },
];

const MAKES = [
  'Toyota', 'Lexus', 'Honda', 'Nissan', 'BMW',
  'Mercedes', 'Hyundai', 'Kia', 'Audi', 'Volkswagen',
  'Ford', 'Chevrolet', 'Mazda', 'Subaru', 'Porsche',
];

const TRANSMISSIONS = [
  { value: 'automatic', label: 'Automatique' },
  { value: 'manual', label: 'Manuelle' },
  { value: 'cvt', label: 'CVT' },
];

const FUEL_TYPES = [
  { value: 'petrol', label: 'Essence' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybride' },
  { value: 'electric', label: 'Electrique' },
  { value: 'lpg', label: 'GPL' },
];

const DRIVE_TYPES: { value: DriveType; label: string }[] = [
  { value: 'FWD', label: 'Traction avant (FWD)' },
  { value: 'RWD', label: 'Propulsion (RWD)' },
  { value: 'AWD', label: 'AWD' },
  { value: '4WD', label: '4x4' },
];

const COLORS: { value: VehicleColor; label: string; hex: string }[] = [
  { value: 'white', label: 'Blanc', hex: '#FFFFFF' },
  { value: 'black', label: 'Noir', hex: '#1a1a1a' },
  { value: 'silver', label: 'Argent', hex: '#C0C0C0' },
  { value: 'gray', label: 'Gris', hex: '#6B7280' },
  { value: 'red', label: 'Rouge', hex: '#DC2626' },
  { value: 'blue', label: 'Bleu', hex: '#2563EB' },
  { value: 'green', label: 'Vert', hex: '#16A34A' },
  { value: 'brown', label: 'Marron', hex: '#78350F' },
  { value: 'beige', label: 'Beige', hex: '#D4B896' },
];

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'sedan', label: 'Berline' },
  { value: 'suv', label: 'SUV / Crossover' },
  { value: 'hatchback', label: 'Compacte' },
  { value: 'pickup', label: 'Pick-up' },
  { value: 'van', label: 'Minivan / Monospace' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'wagon', label: 'Break' },
  { value: 'convertible', label: 'Cabriolet' },
];

const STATUSES: { value: VehicleStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Disponible', color: 'bg-green-500' },
  { value: 'reserved', label: 'Reserve', color: 'bg-yellow-500' },
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
}: DropdownProps) {
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
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
          'bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
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
          {icon}
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
        <div className="absolute z-50 w-full mt-2 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
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

          {options.map((option) => {
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
          })}
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
  const currentYear = new Date().getFullYear();

  // Count active filters
  const activeFiltersCount = [
    filters.source && filters.source !== 'all',
    filters.makes && filters.makes.length > 0,
    filters.yearFrom !== 2015 || filters.yearTo !== currentYear,
    filters.priceFrom !== 0 || filters.priceTo !== 50000,
    filters.mileageMax !== 150000,
    filters.transmission,
    filters.fuelType,
    filters.driveType,
    filters.bodyType,
    filters.color,
    filters.status,
  ].filter(Boolean).length;

  // Get active filter badges
  const getActiveFilterBadges = () => {
    const badges: { label: string; onClear: () => void }[] = [];

    if (filters.source && filters.source !== 'all') {
      const source = SOURCES.find((s) => s.value === filters.source);
      badges.push({
        label: source?.flag ? `${source.flag} ${source.label}` : source?.label || '',
        onClear: () => setFilters({ source: 'all' }),
      });
    }

    if (filters.makes && filters.makes.length > 0) {
      badges.push({
        label: filters.makes.length === 1 ? filters.makes[0] : `${filters.makes.length} marques`,
        onClear: () => setFilters({ makes: [] }),
      });
    }

    if (filters.transmission) {
      const trans = TRANSMISSIONS.find((t) => t.value === filters.transmission);
      badges.push({
        label: trans?.label || '',
        onClear: () => setFilters({ transmission: undefined }),
      });
    }

    if (filters.fuelType) {
      const fuel = FUEL_TYPES.find((f) => f.value === filters.fuelType);
      badges.push({
        label: fuel?.label || '',
        onClear: () => setFilters({ fuelType: undefined }),
      });
    }

    if (filters.driveType) {
      const drive = DRIVE_TYPES.find((d) => d.value === filters.driveType);
      badges.push({
        label: drive?.label || '',
        onClear: () => setFilters({ driveType: undefined }),
      });
    }

    if (filters.bodyType) {
      const body = BODY_TYPES.find((b) => b.value === filters.bodyType);
      badges.push({
        label: body?.label || '',
        onClear: () => setFilters({ bodyType: undefined }),
      });
    }

    if (filters.color) {
      const color = COLORS.find((c) => c.value === filters.color);
      badges.push({
        label: color?.label || '',
        onClear: () => setFilters({ color: undefined }),
      });
    }

    if (filters.status) {
      const status = STATUSES.find((s) => s.value === filters.status);
      badges.push({
        label: status?.label || '',
        onClear: () => setFilters({ status: undefined }),
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
        {/* Source */}
        <FilterDropdown
          label="Origine"
          icon={<MapPin className="w-4 h-4" />}
          value={filters.source}
          placeholder="Toutes origines"
          options={SOURCES.map((s) => ({
            value: s.value,
            label: s.flag ? `${s.flag} ${s.label}` : s.label,
          }))}
          onChange={(val) => setFilters({ source: val as VehicleSource | 'all' | undefined })}
        />

        {/* Makes - Multi Select */}
        <FilterDropdown
          label="Marque"
          icon={<Car className="w-4 h-4" />}
          placeholder="Toutes marques"
          options={MAKES.map((m) => ({ value: m, label: m }))}
          onChange={() => {}}
          multiple
          selectedValues={filters.makes || []}
          onMultiChange={(values) => setFilters({ makes: values })}
        />

        {/* Body Type */}
        <FilterDropdown
          label="Carrosserie"
          icon={<Tag className="w-4 h-4" />}
          value={filters.bodyType}
          placeholder="Tous types"
          options={BODY_TYPES.map((b) => ({ value: b.value, label: b.label }))}
          onChange={(val) => setFilters({ bodyType: val as BodyType | undefined })}
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

        {/* Price Range */}
        <RangeFilter
          label="Prix"
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
          options={TRANSMISSIONS.map((t) => ({ value: t.value, label: t.label }))}
          onChange={(val) => setFilters({ transmission: val as 'automatic' | 'manual' | 'cvt' | undefined })}
        />

        {/* Fuel Type */}
        <FilterDropdown
          label="Carburant"
          icon={<Fuel className="w-4 h-4" />}
          value={filters.fuelType}
          placeholder="Tous"
          options={FUEL_TYPES.map((f) => ({ value: f.value, label: f.label }))}
          onChange={(val) => setFilters({ fuelType: val as 'petrol' | 'diesel' | 'hybrid' | 'electric' | undefined })}
        />

        {/* Drive Type */}
        <FilterDropdown
          label="Transmission"
          icon={<Compass className="w-4 h-4" />}
          value={filters.driveType}
          placeholder="Toutes"
          options={DRIVE_TYPES.map((d) => ({ value: d.value, label: d.label }))}
          onChange={(val) => setFilters({ driveType: val as DriveType | undefined })}
        />

        {/* Color */}
        <FilterDropdown
          label="Couleur"
          icon={<Palette className="w-4 h-4" />}
          value={filters.color}
          placeholder="Toutes couleurs"
          options={COLORS.map((c) => ({ value: c.value, label: c.label, color: c.hex }))}
          onChange={(val) => setFilters({ color: val as VehicleColor | undefined })}
        />

        {/* Status */}
        <FilterDropdown
          label="Disponibilite"
          icon={<Check className="w-4 h-4" />}
          value={filters.status}
          placeholder="Tous"
          options={STATUSES.map((s) => ({ value: s.value, label: s.label, color: s.color.replace('bg-', '') }))}
          onChange={(val) => setFilters({ status: val as VehicleStatus | undefined })}
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
