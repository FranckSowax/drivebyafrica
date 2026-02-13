'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, ArrowRight, Car } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useVehicleFilters } from '@/lib/hooks/useVehicleFilters';
import { useFilterStore } from '@/store/useFilterStore';
import { parseImagesField } from '@/lib/utils/imageProxy';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types/vehicle';

interface SmartSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
}

interface SuggestionsResult {
  vehicles: Vehicle[];
  totalCount: number;
}

/** Fetch vehicle suggestions from PostgREST with total count */
async function fetchSuggestions(query: string): Promise<SuggestionsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || query.length < 2) return { vehicles: [], totalCount: 0 };

  const params = new URLSearchParams();
  params.set('select', 'id,make,model,grade,year,images,source');
  params.append('is_visible', 'eq.true');
  params.append('or', `(make.ilike.*${query}*,model.ilike.*${query}*,grade.ilike.*${query}*,source_id.ilike.*${query}*)`);
  params.set('order', 'id.desc');
  params.set('limit', '3');

  const res = await fetch(`${supabaseUrl}/rest/v1/vehicles?${params}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'count=exact',
    },
  });

  if (!res.ok) return { vehicles: [], totalCount: 0 };

  const vehicles: Vehicle[] = await res.json();

  // Parse total count from Content-Range header (format: "0-2/1234")
  let totalCount = vehicles.length;
  const contentRange = res.headers.get('Content-Range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) totalCount = parseInt(match[1], 10);
  }

  return { vehicles, totalCount };
}

export function SmartSearchBar({ value, onChange, onSubmit, className }: SmartSearchBarProps) {
  const router = useRouter();
  const { setFilters } = useFilterStore();
  const vehicleFilters = useVehicleFilters();
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced query for suggestions
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(value.trim()), 200);
    return () => clearTimeout(t);
  }, [value]);

  // Brand suggestions — instant, client-side from cached filter data
  const brandSuggestions = useMemo(() => {
    if (debouncedQuery.length < 1) return [];
    const q = debouncedQuery.toLowerCase();
    return vehicleFilters.brands
      .filter(b => b.toLowerCase().includes(q))
      .slice(0, 4);
  }, [debouncedQuery, vehicleFilters.brands]);

  // Vehicle suggestions — lightweight PostgREST query
  const { data: suggestionsData, isFetching } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: () => fetchSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const vehicleSuggestions = suggestionsData?.vehicles ?? [];
  const totalMatchCount = suggestionsData?.totalCount ?? 0;

  const showDropdown = isFocused && debouncedQuery.length >= 1 &&
    (brandSuggestions.length > 0 || vehicleSuggestions.length > 0 || isFetching);

  // Total items for keyboard nav (+1 for "see all" button when there are more results)
  const hasMoreResults = totalMatchCount > vehicleSuggestions.length;
  const totalItems = brandSuggestions.length + vehicleSuggestions.length + (hasMoreResults ? 1 : 0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Lock body scroll on mobile when dropdown is open
  useEffect(() => {
    if (showDropdown && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showDropdown]);

  // Reset selected index when suggestions change
  useEffect(() => setSelectedIndex(-1), [debouncedQuery]);

  const handleSelectBrand = useCallback((brand: string) => {
    setFilters({ makes: [brand], search: undefined });
    onChange('');
    setIsFocused(false);
    inputRef.current?.blur();
  }, [setFilters, onChange]);

  const handleSelectVehicle = useCallback((vehicle: Vehicle) => {
    setIsFocused(false);
    inputRef.current?.blur();
    router.push(`/cars/${vehicle.id}`);
  }, [router]);

  const handleViewAll = useCallback(() => {
    setFilters({ search: debouncedQuery });
    setIsFocused(false);
    inputRef.current?.blur();
    onSubmit?.();
  }, [debouncedQuery, setFilters, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Enter') onSubmit?.();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < brandSuggestions.length) {
          handleSelectBrand(brandSuggestions[selectedIndex]);
        } else if (selectedIndex >= brandSuggestions.length && selectedIndex < brandSuggestions.length + vehicleSuggestions.length) {
          handleSelectVehicle(vehicleSuggestions[selectedIndex - brandSuggestions.length]);
        } else if (hasMoreResults && selectedIndex === brandSuggestions.length + vehicleSuggestions.length) {
          handleViewAll();
        } else {
          onSubmit?.();
          setIsFocused(false);
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  const getFirstImage = (vehicle: Vehicle) => {
    const images = parseImagesField(vehicle.images);
    if (images.length === 0) return null;
    return getProxiedImageUrl(images[0]);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Mobile backdrop overlay */}
      {showDropdown && (
        <div
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          onClick={() => { setIsFocused(false); inputRef.current?.blur(); }}
        />
      )}

      {/* Search Input */}
      <div className="relative z-50">
        <div className="absolute left-3 sm:left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <Search className="w-4 h-4 sm:w-4 sm:h-4" />
        </div>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher marque, modèle, référence..."
          className={cn(
            'w-full h-11 sm:h-10 pl-10 pr-10 bg-[var(--surface)] border rounded-lg text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-mandarin focus:border-transparent',
            showDropdown
              ? 'border-mandarin ring-2 ring-mandarin/20 rounded-b-none'
              : 'border-[var(--card-border)] hover:border-[var(--text-muted)]',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isFetching && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-mandarin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={cn(
            'z-50 bg-[var(--card-bg)] border border-t-0 border-[var(--card-border)] shadow-xl overflow-y-auto',
            // Mobile: fixed bottom sheet style
            'fixed inset-x-0 bottom-0 top-auto max-h-[60vh] rounded-t-xl border-t sm:border-t-0',
            // Desktop: absolute dropdown attached to input
            'sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:right-0 sm:bottom-auto sm:max-h-[400px] sm:rounded-t-none sm:rounded-b-lg',
          )}
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center py-2 sticky top-0 bg-[var(--card-bg)] z-10">
            <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]/30" />
          </div>

          {/* Brand suggestions */}
          {brandSuggestions.length > 0 && (
            <div>
              <div className="px-4 sm:px-3 py-2 sm:py-1.5 text-[11px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--surface)]">
                Marques
              </div>
              {brandSuggestions.map((brand, i) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleSelectBrand(brand)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 sm:py-2.5 text-sm transition-colors',
                    selectedIndex === i
                      ? 'bg-mandarin/10 text-mandarin'
                      : 'text-[var(--text-primary)] hover:bg-[var(--surface)] active:bg-[var(--surface)]'
                  )}
                >
                  <Car className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0 text-[var(--text-muted)]" />
                  <span className="flex-1 text-left text-base sm:text-sm">
                    {highlightMatch(brand, debouncedQuery)}
                  </span>
                  <ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          )}

          {/* Vehicle suggestions */}
          {vehicleSuggestions.length > 0 && (
            <div>
              <div className="px-4 sm:px-3 py-2 sm:py-1.5 text-[11px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--surface)]">
                Véhicules
              </div>
              {vehicleSuggestions.map((vehicle, i) => {
                const idx = brandSuggestions.length + i;
                const img = getFirstImage(vehicle);
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => handleSelectVehicle(vehicle)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 transition-colors',
                      selectedIndex === idx
                        ? 'bg-mandarin/10'
                        : 'hover:bg-[var(--surface)] active:bg-[var(--surface)]'
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-10 sm:w-12 sm:h-9 rounded-md overflow-hidden bg-[var(--surface)] flex-shrink-0">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="w-5 h-5 sm:w-4 sm:h-4 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {highlightMatch(`${vehicle.make} ${vehicle.model}`, debouncedQuery)}
                        {vehicle.grade && (
                          <span className="text-[var(--text-muted)] font-normal"> {vehicle.grade}</span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {vehicle.year} {vehicle.source && `· ${vehicle.source}`}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                  </button>
                );
              })}

              {/* View all results button */}
              {hasMoreResults && (
                <button
                  type="button"
                  onClick={handleViewAll}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3.5 sm:py-3 text-sm font-medium transition-colors border-t border-[var(--card-border)]',
                    selectedIndex === brandSuggestions.length + vehicleSuggestions.length
                      ? 'bg-mandarin/10 text-mandarin'
                      : 'text-mandarin hover:bg-mandarin/5 active:bg-mandarin/10'
                  )}
                >
                  <Search className="w-4 h-4" />
                  Voir tous les résultats ({totalMatchCount.toLocaleString('fr-FR')})
                </button>
              )}
            </div>
          )}

          {/* Loading state */}
          {isFetching && vehicleSuggestions.length === 0 && brandSuggestions.length === 0 && (
            <div className="px-4 py-8 sm:py-6 text-sm text-[var(--text-muted)] text-center flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Recherche...
            </div>
          )}

          {/* No results */}
          {!isFetching && debouncedQuery.length >= 2 && brandSuggestions.length === 0 && vehicleSuggestions.length === 0 && (
            <div className="px-4 py-6 sm:py-4 text-sm text-[var(--text-muted)] text-center">
              Aucun résultat pour &laquo; {debouncedQuery} &raquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Highlight matching text in a suggestion */
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-mandarin font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
