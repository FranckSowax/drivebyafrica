'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  RotateCcw,
  Search,
  Car,
  Calendar,
  DollarSign,
  Gauge,
  Cog,
  Fuel,
  Compass,
  Palette,
  Tag,
  Globe,
} from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { useFilterStore } from '@/store/useFilterStore';
import { useVehicleFilters, translateFilter, getColorHex } from '@/lib/hooks/useVehicleFilters';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/utils';
import type { VehicleSource } from '@/types/vehicle';

// Source options with flag emojis
const SOURCE_OPTIONS = [
  { value: 'korea', label: 'Corée du Sud', icon: '🇰🇷' },
  { value: 'china', label: 'Chine', icon: '🇨🇳' },
  { value: 'dubai', label: 'Dubaï', icon: '🇦🇪' },
];

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  totalCount: number;
  isLoading: boolean;
}

type SubView =
  | null
  | 'source'
  | 'makes'
  | 'models'
  | 'bodyType'
  | 'year'
  | 'price'
  | 'mileage'
  | 'transmission'
  | 'fuelType'
  | 'driveType'
  | 'color';

export function MobileFilterSheet({ isOpen, onClose, totalCount, isLoading }: MobileFilterSheetProps) {
  const { filters, setFilters, resetFilters } = useFilterStore();
  const vehicleFilters = useVehicleFilters();
  const { currencyInfo } = useCurrency();
  const [subView, setSubView] = useState<SubView>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const currentYear = new Date().getFullYear();

  // Price constants
  const PRICE_MIN = 0;
  const PRICE_MAX = 200000;
  const MILEAGE_MIN = 0;
  const MILEAGE_MAX = 500000;

  // Format price with currency
  const formatPriceShort = useCallback((amountUsd: number): string => {
    const rate = currencyInfo?.rateToUsd || 1;
    const converted = amountUsd * rate;
    const code = currencyInfo?.code || 'USD';
    const formatShort = (n: number): string => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toString();
    };
    if (code === 'XAF' || code === 'XOF') return `${formatShort(converted)} FCFA`;
    if (code === 'EUR') return `${formatShort(converted)} €`;
    if (code === 'USD') return `$${formatShort(converted)}`;
    return `${currencyInfo?.symbol || '$'}${formatShort(converted)}`;
  }, [currencyInfo]);

  // Fetch models when brands are selected
  const { data: modelsData } = useQuery({
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
  });

  const modelOptions = useMemo(() => {
    if (!filters.makes || filters.makes.length === 0 || !modelsData) return [];
    const models: string[] = [];
    for (const make of filters.makes) {
      models.push(...(modelsData[make] || []));
    }
    return [...new Set(models)].sort();
  }, [filters.makes, modelsData]);

  // Count active filters
  const activeCount = useMemo(() => {
    return [
      filters.source && filters.source !== 'all',
      filters.makes && filters.makes.length > 0,
      filters.models && filters.models.length > 0,
      filters.bodyType,
      filters.yearFrom || filters.yearTo,
      filters.priceFrom || filters.priceTo,
      filters.mileageMax,
      filters.transmission,
      filters.fuelType,
      filters.driveType,
      filters.color,
    ].filter(Boolean).length;
  }, [filters]);

  // Format result count
  const formattedCount = totalCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Get display value for a filter category
  const getDisplayValue = (key: SubView): string => {
    switch (key) {
      case 'source': {
        if (!filters.source || filters.source === 'all') return 'Tous pays';
        const opt = SOURCE_OPTIONS.find(o => o.value === filters.source);
        return opt ? `${opt.icon} ${opt.label}` : filters.source;
      }
      case 'makes':
        if (!filters.makes || filters.makes.length === 0) return 'Toutes';
        return filters.makes.length === 1 ? filters.makes[0] : `${filters.makes.length} marques`;
      case 'models':
        if (!filters.models || filters.models.length === 0) return 'Tous';
        return filters.models.length === 1 ? filters.models[0] : `${filters.models.length} modèles`;
      case 'bodyType':
        return filters.bodyType ? translateFilter('body', filters.bodyType) : 'Tous types';
      case 'year': {
        const from = filters.yearFrom || 2000;
        const to = filters.yearTo || currentYear;
        if (from === 2000 && to === currentYear) return 'Toutes';
        return `${from} - ${to}`;
      }
      case 'price': {
        if (!filters.priceFrom && !filters.priceTo) return 'Tous prix';
        const from = filters.priceFrom || PRICE_MIN;
        const to = filters.priceTo || PRICE_MAX;
        return `${formatPriceShort(from)} - ${formatPriceShort(to)}`;
      }
      case 'mileage':
        if (!filters.mileageMax) return 'Tous';
        return `< ${filters.mileageMax.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} km`;
      case 'transmission':
        return filters.transmission ? translateFilter('transmission', filters.transmission) : 'Toutes';
      case 'fuelType':
        return filters.fuelType ? translateFilter('fuel', filters.fuelType) : 'Tous';
      case 'driveType':
        return filters.driveType ? translateFilter('drive', filters.driveType) : 'Toutes';
      case 'color':
        return filters.color ? translateFilter('color', filters.color) : 'Toutes';
      default:
        return '';
    }
  };

  const isFilterActive = (key: SubView): boolean => {
    switch (key) {
      case 'source': return !!filters.source && filters.source !== 'all';
      case 'makes': return !!filters.makes && filters.makes.length > 0;
      case 'models': return !!filters.models && filters.models.length > 0;
      case 'bodyType': return !!filters.bodyType;
      case 'year': return !!filters.yearFrom || !!filters.yearTo;
      case 'price': return !!filters.priceFrom || !!filters.priceTo;
      case 'mileage': return !!filters.mileageMax;
      case 'transmission': return !!filters.transmission;
      case 'fuelType': return !!filters.fuelType;
      case 'driveType': return !!filters.driveType;
      case 'color': return !!filters.color;
      default: return false;
    }
  };

  // Filter category definitions
  const categories: { key: SubView; label: string; icon: React.ReactNode }[] = [
    { key: 'source', label: "Pays d'origine", icon: <Globe className="w-5 h-5" /> },
    { key: 'makes', label: 'Marque', icon: <Car className="w-5 h-5" /> },
    ...(filters.makes && filters.makes.length > 0 ? [{ key: 'models' as SubView, label: 'Modèle', icon: <Car className="w-5 h-5" /> }] : []),
    { key: 'bodyType', label: 'Carrosserie', icon: <Tag className="w-5 h-5" /> },
    { key: 'year', label: 'Année', icon: <Calendar className="w-5 h-5" /> },
    { key: 'price', label: 'Prix', icon: <DollarSign className="w-5 h-5" /> },
    { key: 'mileage', label: 'Kilométrage', icon: <Gauge className="w-5 h-5" /> },
    { key: 'transmission', label: 'Boîte de vitesse', icon: <Cog className="w-5 h-5" /> },
    { key: 'fuelType', label: 'Carburant', icon: <Fuel className="w-5 h-5" /> },
    { key: 'driveType', label: 'Transmission', icon: <Compass className="w-5 h-5" /> },
    { key: 'color', label: 'Couleur', icon: <Palette className="w-5 h-5" /> },
  ];

  if (!isOpen) return null;

  // ---- SUB-VIEW: Single/Multi Select List ----
  const renderListSubView = (
    title: string,
    options: { value: string; label: string; icon?: string; color?: string }[],
    selectedValue: string | undefined | string[],
    onChange: (val: string | undefined) => void,
    multi = false,
    selectedValues: string[] = [],
    onMultiChange?: (vals: string[]) => void,
  ) => {
    const filtered = searchTerm
      ? options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
      : options;

    return (
      <div className="flex flex-col h-full">
        {/* Sub-view header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)] flex-shrink-0">
          <button
            onClick={() => { setSubView(null); setSearchTerm(''); }}
            className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex-1">{title}</h2>
          {multi && selectedValues.length > 0 && (
            <button
              onClick={() => onMultiChange?.([])}
              className="text-xs text-mandarin"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Search bar for long lists */}
        {options.length > 8 && (
          <div className="px-4 py-2 border-b border-[var(--card-border)] flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-xl">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="flex-1 text-sm bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                autoFocus
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}>
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Options list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* "All" option for single select */}
          {!multi && (
            <button
              onClick={() => { onChange(undefined); setSubView(null); setSearchTerm(''); }}
              className={cn(
                'w-full flex items-center gap-3 px-5 py-3.5 border-b border-[var(--card-border)] transition-colors',
                !selectedValue ? 'bg-mandarin/5' : ''
              )}
            >
              <span className="flex-1 text-left text-[var(--text-primary)]">Tous</span>
              {!selectedValue && <Check className="w-5 h-5 text-mandarin" />}
            </button>
          )}

          {filtered.map((option) => {
            const isSelected = multi
              ? selectedValues.includes(option.value)
              : selectedValue === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  if (multi && onMultiChange) {
                    const newVals = isSelected
                      ? selectedValues.filter(v => v !== option.value)
                      : [...selectedValues, option.value];
                    onMultiChange(newVals);
                  } else {
                    onChange(option.value);
                    setSubView(null);
                    setSearchTerm('');
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-5 py-3.5 border-b border-[var(--card-border)] transition-colors active:bg-[var(--surface)]',
                  isSelected ? 'bg-mandarin/5' : ''
                )}
              >
                {option.icon && <span className="text-lg">{option.icon}</span>}
                {option.color && (
                  <span
                    className="w-5 h-5 rounded-full border border-[var(--card-border)] flex-shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span className={cn(
                  'flex-1 text-left',
                  isSelected ? 'text-mandarin font-medium' : 'text-[var(--text-primary)]'
                )}>
                  {option.label}
                </span>
                {isSelected && <Check className="w-5 h-5 text-mandarin flex-shrink-0" />}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-[var(--text-muted)] text-sm">
              Aucun résultat
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- SUB-VIEW: Range Slider ----
  const renderRangeSubView = (
    title: string,
    min: number,
    max: number,
    step: number,
    value: [number, number],
    onChange: (val: [number, number]) => void,
    formatValue: (val: number) => string,
  ) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)] flex-shrink-0">
        <button
          onClick={() => setSubView(null)}
          className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex-1">{title}</h2>
        {(value[0] !== min || value[1] !== max) && (
          <button
            onClick={() => onChange([min, max])}
            className="text-xs text-mandarin"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="flex-1 px-6 pt-12 pb-6">
        {/* Current range display */}
        <div className="text-center mb-10">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {formatValue(value[0])} — {formatValue(value[1])}
          </p>
        </div>

        {/* Slider */}
        <div className="px-2">
          <Slider
            min={min}
            max={max}
            step={step}
            value={value}
            onValueChange={onChange}
          />
        </div>

        {/* Min/max labels */}
        <div className="flex justify-between mt-4 text-xs text-[var(--text-muted)]">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      </div>
    </div>
  );

  // ---- Render active sub-view ----
  const renderSubView = () => {
    switch (subView) {
      case 'source':
        return renderListSubView(
          "Pays d'origine",
          SOURCE_OPTIONS.map(o => ({ ...o })),
          filters.source === 'all' ? undefined : filters.source,
          (val) => setFilters({ source: (val as VehicleSource) || 'all' }),
        );

      case 'makes':
        return renderListSubView(
          'Marque',
          vehicleFilters.brands.map(b => ({ value: b, label: b })),
          undefined,
          () => {},
          true,
          filters.makes || [],
          (vals) => setFilters({ makes: vals, models: [] }),
        );

      case 'models':
        return renderListSubView(
          'Modèle',
          modelOptions.map(m => ({ value: m, label: m })),
          undefined,
          () => {},
          true,
          filters.models || [],
          (vals) => setFilters({ models: vals }),
        );

      case 'bodyType':
        return renderListSubView(
          'Carrosserie',
          vehicleFilters.bodyTypes.map(b => ({ value: b, label: translateFilter('body', b) })),
          filters.bodyType,
          (val) => setFilters({ bodyType: val }),
        );

      case 'year':
        return renderRangeSubView(
          'Année',
          2000,
          currentYear,
          1,
          [filters.yearFrom || 2000, filters.yearTo || currentYear],
          ([from, to]) => setFilters({
            yearFrom: from === 2000 ? undefined : from,
            yearTo: to === currentYear ? undefined : to,
          }),
          (val) => val.toString(),
        );

      case 'price':
        return renderRangeSubView(
          'Prix',
          PRICE_MIN,
          PRICE_MAX,
          1000,
          [filters.priceFrom ?? PRICE_MIN, filters.priceTo ?? PRICE_MAX],
          ([from, to]) => setFilters({
            priceFrom: from === PRICE_MIN ? undefined : from,
            priceTo: to === PRICE_MAX ? undefined : to,
          }),
          formatPriceShort,
        );

      case 'mileage':
        return renderRangeSubView(
          'Kilométrage',
          MILEAGE_MIN,
          MILEAGE_MAX,
          5000,
          [MILEAGE_MIN, filters.mileageMax ?? MILEAGE_MAX],
          ([, max]) => setFilters({ mileageMax: max === MILEAGE_MAX ? undefined : max }),
          (val) => `${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} km`,
        );

      case 'transmission':
        return renderListSubView(
          'Boîte de vitesse',
          vehicleFilters.transmissionTypes.map(t => ({ value: t, label: translateFilter('transmission', t) })),
          filters.transmission,
          (val) => setFilters({ transmission: val }),
        );

      case 'fuelType':
        return renderListSubView(
          'Carburant',
          vehicleFilters.fuelTypes.map(f => ({ value: f, label: translateFilter('fuel', f) })),
          filters.fuelType,
          (val) => setFilters({ fuelType: val }),
        );

      case 'driveType':
        return renderListSubView(
          'Transmission',
          vehicleFilters.driveTypes.map(d => ({ value: d, label: translateFilter('drive', d) })),
          filters.driveType,
          (val) => setFilters({ driveType: val }),
        );

      case 'color':
        return renderListSubView(
          'Couleur',
          vehicleFilters.colors.map(c => ({
            value: c,
            label: translateFilter('color', c),
            color: getColorHex(c),
          })),
          filters.color,
          (val) => setFilters({ color: val }),
        );

      default:
        return null;
    }
  };

  // ---- MAIN VIEW: Category list ----
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Full-screen sheet */}
      <div className="absolute inset-0 bg-[var(--card-bg)] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Content: either main view or sub-view */}
        {subView ? (
          <>
            {renderSubView()}

            {/* Bottom button in sub-view */}
            <div
              className="flex-shrink-0 px-4 pt-3 bg-[var(--card-bg)] border-t border-[var(--card-border)]"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={() => { setSubView(null); setSearchTerm(''); }}
                className="w-full h-12 bg-mandarin text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2 active:bg-mandarin/90 transition-colors"
              >
                <Search className="w-4 h-4" />
                {isLoading ? 'Chargement...' : `Voir ${formattedCount} résultats`}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Main header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] flex-shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Filtres</h2>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-mandarin rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Tout effacer
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {categories.map(({ key, label, icon }) => {
                const active = isFilterActive(key);
                const displayVal = getDisplayValue(key);

                return (
                  <button
                    key={key}
                    onClick={() => setSubView(key)}
                    className="w-full flex items-center gap-4 px-5 py-4 border-b border-[var(--card-border)] active:bg-[var(--surface)] transition-colors"
                  >
                    <span className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
                      active ? 'bg-mandarin/10 text-mandarin' : 'bg-[var(--surface)] text-[var(--text-muted)]'
                    )}>
                      {icon}
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                      <p className={cn(
                        'text-xs truncate',
                        active ? 'text-mandarin font-medium' : 'text-[var(--text-muted)]'
                      )}>
                        {displayVal}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Bottom button */}
            <div
              className="flex-shrink-0 px-4 pt-3 bg-[var(--card-bg)] border-t border-[var(--card-border)]"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={onClose}
                className="w-full h-12 bg-mandarin text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2 active:bg-mandarin/90 transition-colors"
              >
                <Search className="w-4 h-4" />
                {isLoading ? 'Chargement...' : `Voir ${formattedCount} résultats`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
