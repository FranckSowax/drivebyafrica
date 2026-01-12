'use client';

import { useState } from 'react';
import { X, Save, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { useFilterStore } from '@/store/useFilterStore';
import { cn } from '@/lib/utils';
import type { VehicleSource } from '@/types/vehicle';

const SOURCES: { value: VehicleSource | 'all'; label: string; flag?: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'korea', label: 'Corée', flag: '🇰🇷' },
  { value: 'china', label: 'Chine', flag: '🇨🇳' },
  { value: 'dubai', label: 'Dubaï', flag: '🇦🇪' },
];

const MAKES = [
  'Toyota',
  'Lexus',
  'Honda',
  'Nissan',
  'BMW',
  'Mercedes',
  'Hyundai',
  'Kia',
  'Audi',
  'Volkswagen',
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
  { value: 'electric', label: 'Électrique' },
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-900 hover:text-mandarin transition-colors"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
}

interface VehicleFiltersProps {
  onApply?: () => void;
  className?: string;
}

export function VehicleFilters({ onApply, className }: VehicleFiltersProps) {
  const { filters, setFilters, resetFilters } = useFilterStore();
  const [showSaveModal, setShowSaveModal] = useState(false);

  const currentYear = new Date().getFullYear();

  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl p-5 shadow-sm', className)}>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-gray-900">Filtres</h2>
        <button
          onClick={resetFilters}
          className="text-sm text-gray-500 hover:text-mandarin flex items-center gap-1 transition-colors"
        >
          <X className="w-4 h-4" />
          Réinitialiser
        </button>
      </div>

      <div className="space-y-4">
        {/* Source */}
        <FilterSection title="Source">
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((source) => (
              <button
                key={source.value}
                onClick={() => setFilters({ source: source.value })}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  filters.source === source.value
                    ? 'bg-mandarin text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {source.flag && <span className="mr-1">{source.flag}</span>}
                {source.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Make */}
        <FilterSection title="Marque">
          <div className="flex flex-wrap gap-2">
            {MAKES.map((make) => (
              <button
                key={make}
                onClick={() => {
                  const makes = filters.makes || [];
                  const newMakes = makes.includes(make)
                    ? makes.filter((m) => m !== make)
                    : [...makes, make];
                  setFilters({ makes: newMakes });
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  filters.makes?.includes(make)
                    ? 'bg-mandarin text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {make}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Year Range */}
        <FilterSection title="Année">
          <Slider
            min={2000}
            max={currentYear}
            value={[filters.yearFrom || 2015, filters.yearTo || currentYear]}
            onValueChange={([from, to]) =>
              setFilters({ yearFrom: from, yearTo: to })
            }
            formatValue={(val) => val.toString()}
          />
        </FilterSection>

        {/* Price Range */}
        <FilterSection title="Prix (USD)">
          <Slider
            min={0}
            max={100000}
            step={1000}
            value={[filters.priceFrom || 0, filters.priceTo || 50000]}
            onValueChange={([from, to]) =>
              setFilters({ priceFrom: from, priceTo: to })
            }
            formatValue={(val) => `$${val.toLocaleString()}`}
          />
        </FilterSection>

        {/* Mileage */}
        <FilterSection title="Kilométrage max">
          <Slider
            min={0}
            max={200000}
            step={5000}
            value={[0, filters.mileageMax || 150000]}
            onValueChange={([, max]) => setFilters({ mileageMax: max })}
            formatValue={(val) => `${val.toLocaleString()} km`}
          />
        </FilterSection>

        {/* Transmission */}
        <FilterSection title="Transmission" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {TRANSMISSIONS.map((trans) => (
              <button
                key={trans.value}
                onClick={() =>
                  setFilters({
                    transmission:
                      filters.transmission === trans.value
                        ? undefined
                        : (trans.value as 'automatic' | 'manual' | 'cvt'),
                  })
                }
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  filters.transmission === trans.value
                    ? 'bg-mandarin text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {trans.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Fuel Type */}
        <FilterSection title="Carburant" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {FUEL_TYPES.map((fuel) => (
              <button
                key={fuel.value}
                onClick={() =>
                  setFilters({
                    fuelType:
                      filters.fuelType === fuel.value
                        ? undefined
                        : (fuel.value as 'petrol' | 'diesel' | 'hybrid' | 'electric'),
                  })
                }
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  filters.fuelType === fuel.value
                    ? 'bg-mandarin text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {fuel.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="primary" className="flex-1" onClick={onApply}>
            Appliquer
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>

        {/* Alert Toggle */}
        <label className="flex items-center gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={filters.notifyNewMatches || false}
            onChange={(e) => setFilters({ notifyNewMatches: e.target.checked })}
            className="sr-only peer"
          />
          <div className="relative w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-mandarin transition-colors">
            <div
              className={cn(
                'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                filters.notifyNewMatches && 'translate-x-4'
              )}
            />
          </div>
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">Alertes nouveaux véhicules</span>
        </label>
      </div>
    </div>
  );
}
