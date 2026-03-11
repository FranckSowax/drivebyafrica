'use client';

import { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Sparkles, AlertTriangle } from 'lucide-react';
import { VehicleGrid, VehicleFilters, MobileFilterSheet, SmartSearchBar } from '@/components/vehicles';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { useVehicles } from '@/lib/hooks/useVehicles';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { useFilterStore } from '@/store/useFilterStore';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'year_desc', label: 'Année (récent)' },
  { value: 'year_asc', label: 'Année (ancien)' },
  { value: 'mileage_asc', label: 'Kilométrage (bas)' },
  { value: 'mileage_desc', label: 'Kilométrage (haut)' },
];

const ITEMS_PER_PAGE = 36;

export default function CarsPage() {
  const { filters, setFilters, _hasHydrated } = useFilterStore();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  // Local search state - synced with store
  const [searchQuery, setSearchQuery] = useState('');

  // Safety timeout: if hydration hasn't completed after 2s, force it
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useFilterStore.getState()._hasHydrated) {
        useFilterStore.setState({ _hasHydrated: true });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Track previous filters to detect changes
  const prevFiltersRef = useRef<string>('');

  // Sync local search when store hydrates from localStorage
  useEffect(() => {
    if (_hasHydrated) {
      setSearchQuery(filters.search || '');
    }
  }, [_hasHydrated, filters.search]);

  // Use vehicles hook with current filters
  // Always pass filters to ensure data loads (defaultFilters are used before hydration)
  const { vehicles, isLoading, error, totalCount } = useVehicles({
    filters,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const { favorites, toggleFavorite } = useFavorites();

  // Reset page when filters change (but not on initial hydration)
  useEffect(() => {
    if (!_hasHydrated) return;

    const currentFiltersStr = JSON.stringify(filters);
    if (prevFiltersRef.current && prevFiltersRef.current !== currentFiltersStr) {
      setPage(1);
    }
    prevFiltersRef.current = currentFiltersStr;
  }, [filters, _hasHydrated]);

  // Debounced search - update store after user stops typing
  useEffect(() => {
    if (!_hasHydrated) return;

    const debounce = setTimeout(() => {
      const currentSearch = filters.search || '';
      if (searchQuery !== currentSearch) {
        setFilters({ search: searchQuery || undefined });
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, _hasHydrated]);

  const handleSearch = () => {
    if (_hasHydrated) {
      setFilters({ search: searchQuery || undefined });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of results
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Show loading state during hydration
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="bg-gradient-to-b from-[var(--surface)] to-transparent py-10 lg:py-14">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-2">
              <span className="text-mandarin">TROUVEZ</span> VOTRE VÉHICULE
            </h1>
            <p className="text-[var(--text-muted)] max-w-xl">
              Explorez des véhicules vérifiés de Corée, Chine et Dubaï.
              Obtenez une estimation des frais et réservez avec un acompte.
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-4">
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-mandarin border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-[var(--surface)] to-transparent py-10 lg:py-14">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-2">
            <span className="text-mandarin">TROUVEZ</span> VOTRE VÉHICULE
          </h1>
          <p className="text-[var(--text-muted)] max-w-xl">
            Explorez des véhicules vérifiés de Corée, Chine et Dubaï.
            Obtenez une estimation des frais et réservez avec un acompte.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Desktop Sidebar Filters — filters auto-apply via Zustand/React Query */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <VehicleFilters />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Search & Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Smart Search */}
              <SmartSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                isLoading={isLoading && !!searchQuery}
                className="flex-1"
              />

              <div className="flex gap-3">
                {/* Mobile Filter Button */}
                <Button
                  variant="outline"
                  className="lg:hidden flex items-center gap-2 relative"
                  onClick={() => setShowMobileFilters(true)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtres
                  {(() => {
                    const count = [
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
                    return count > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-mandarin text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    ) : null;
                  })()}
                </Button>

                {/* Sort */}
                <Select
                  options={SORT_OPTIONS}
                  value={filters.sortBy || 'price_asc'}
                  onChange={(e) =>
                    setFilters({ sortBy: e.target.value as typeof filters.sortBy })
                  }
                  className="w-full sm:w-48"
                />
              </div>
            </div>

            {/* New Arrivals Toggle + Results Count */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFilters({ newArrivals: !filters.newArrivals })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.newArrivals
                      ? 'bg-mandarin text-white'
                      : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--card-border)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Nouveautés
                </button>
                <p className="text-[var(--text-muted)]">
                  <span className="text-[var(--text-primary)] font-bold">
                    {totalCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  </span>{' '}
                  véhicules {filters.newArrivals ? 'ajoutés récemment' : 'disponibles'}
                </p>
              </div>
            </div>

            {/* Search Error Banner */}
            {error && (
              <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error.message}</span>
              </div>
            )}

            {/* Vehicle Grid — wraps with opacity transition during filter changes */}
            <div className={`transition-opacity duration-200 ${isLoading && vehicles.length > 0 ? 'opacity-50' : 'opacity-100'}`}>
              <VehicleGrid
                vehicles={vehicles}
                isLoading={isLoading}
                favorites={favorites}
                onFavorite={toggleFavorite}
              />
            </div>

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
                <p className="text-sm text-[var(--text-muted)]">
                  Page {page} sur {totalPages}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters — full-screen sheet with drill-down navigation */}
      <MobileFilterSheet
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        totalCount={totalCount}
        isLoading={isLoading}
      />
    </div>
  );
}
