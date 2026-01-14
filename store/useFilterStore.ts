import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VehicleFilters } from '@/types/vehicle';

interface FilterState {
  filters: VehicleFilters;
  setFilters: (filters: Partial<VehicleFilters>) => void;
  resetFilters: () => void;
  savedFilters: { id: string; name: string; filters: VehicleFilters }[];
  saveFilter: (name: string) => void;
  deleteFilter: (id: string) => void;
  loadFilter: (id: string) => void;
}

const defaultFilters: VehicleFilters = {
  source: 'all',
  makes: [],
  models: [],
  yearFrom: undefined,
  yearTo: undefined,
  priceFrom: undefined,
  priceTo: undefined,
  mileageMax: undefined,
  sortBy: 'price_asc',
  notifyNewMatches: false,
  driveType: undefined,
  color: undefined,
  bodyType: undefined,
  status: undefined,
  search: undefined,
  transmission: undefined,
  fuelType: undefined,
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      savedFilters: [],

      saveFilter: (name) => {
        const { filters, savedFilters } = get();
        const id = Math.random().toString(36).substring(2, 9);
        set({
          savedFilters: [...savedFilters, { id, name, filters: { ...filters } }],
        });
      },

      deleteFilter: (id) =>
        set((state) => ({
          savedFilters: state.savedFilters.filter((f) => f.id !== id),
        })),

      loadFilter: (id) => {
        const { savedFilters } = get();
        const saved = savedFilters.find((f) => f.id === id);
        if (saved) {
          set({ filters: { ...saved.filters } });
        }
      },
    }),
    {
      name: 'filter-storage',
    }
  )
);
