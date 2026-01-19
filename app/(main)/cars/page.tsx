'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { VehicleGrid, VehicleFilters } from '@/components/vehicles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { useVehicles } from '@/lib/hooks/useVehicles';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { useFilterStore } from '@/store/useFilterStore';

// Note: Only 'newest' sort works on 80k+ rows without database indexes
// Other sorts (price, year, mileage) cause statement timeouts
// TODO: Re-enable once database indexes are added
const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
];

const ITEMS_PER_PAGE = 36;

export default function CarsPage() {
  const { filters, setFilters } = useFilterStore();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [isHydrated, setIsHydrated] = useState(false);

  // Local search state - synced with store
  const [searchQuery, setSearchQuery] = useState('');

  // Track previous filters to detect changes
  const prevFiltersRef = useRef<string>('');

  // Handle hydration - wait for store to be ready
  useEffect(() => {
    setIsHydrated(true);
    // Sync local search with store after hydration
    setSearchQuery(filters.search || '');
  }, []);

  // Update local search when filters.search changes (e.g., from store hydration)
  useEffect(() => {
    if (isHydrated && filters.search !== undefined) {
      setSearchQuery(filters.search || '');
    }
  }, [filters.search, isHydrated]);

  // Use vehicles hook with current filters
  // Always pass filters to ensure data loads (defaultFilters are used before hydration)
  const { vehicles, isLoading, totalCount, refetch } = useVehicles({
    filters,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const { favorites, toggleFavorite } = useFavorites();

  // Reset page when filters change (but not on initial hydration)
  useEffect(() => {
    if (!isHydrated) return;

    const currentFiltersStr = JSON.stringify(filters);
    if (prevFiltersRef.current && prevFiltersRef.current !== currentFiltersStr) {
      setPage(1);
    }
    prevFiltersRef.current = currentFiltersStr;
  }, [filters, isHydrated]);

  // Debounced search - update store after user stops typing
  useEffect(() => {
    if (!isHydrated) return;

    const debounce = setTimeout(() => {
      const currentSearch = filters.search || '';
      if (searchQuery !== currentSearch) {
        setFilters({ search: searchQuery || undefined });
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, isHydrated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHydrated) {
      setFilters({ search: searchQuery || undefined });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of results
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Show loading state during hydration
  if (!isHydrated) {
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
        <div className="container mx-auto px-4 pb-12">
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
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <VehicleFilters onApply={refetch} />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Search & Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <Input
                  type="search"
                  placeholder="Rechercher par marque, modèle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </form>

              <div className="flex gap-3">
                {/* Mobile Filter Button */}
                <Button
                  variant="outline"
                  className="lg:hidden flex items-center gap-2"
                  onClick={() => setShowMobileFilters(true)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtres
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

            {/* Results Count */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-[var(--text-muted)]">
                <span className="text-[var(--text-primary)] font-bold">
                  {totalCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                </span>{' '}
                véhicules disponibles
              </p>
            </div>

            {/* Vehicle Grid */}
            <VehicleGrid
              vehicles={vehicles}
              isLoading={isLoading}
              favorites={favorites}
              onFavorite={toggleFavorite}
            />

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

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-[var(--card-bg)] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 bg-[var(--card-bg)] border-b border-[var(--card-border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Filtres</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <VehicleFilters
                onApply={() => {
                  refetch();
                  setShowMobileFilters(false);
                }}
                className="border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
