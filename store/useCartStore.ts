import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VehicleSource } from '@/types/vehicle';

export interface CartItem {
  vehicleId: string;
  vehicleSource: VehicleSource;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePriceUSD: number;
  imageUrl: string | null;
  addedAt: number;
}

interface CartState {
  items: CartItem[];
  _hasHydrated: boolean;
  addItem: (item: Omit<CartItem, 'addedAt'>) => { success: boolean; error?: string };
  removeItem: (vehicleId: string) => void;
  clearCart: () => void;
  canAdd: (source: VehicleSource) => { allowed: boolean; reason?: string };
}

const MAX_ITEMS = 3;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      _hasHydrated: false,

      canAdd: (source: VehicleSource) => {
        const { items } = get();
        if (items.length >= MAX_ITEMS) {
          return { allowed: false, reason: 'Maximum 3 véhicules par container 40 pieds' };
        }
        if (items.length > 0 && items[0].vehicleSource !== source) {
          return {
            allowed: false,
            reason: `Tous les véhicules doivent provenir de la même source (${items[0].vehicleSource === 'korea' ? 'Corée' : items[0].vehicleSource === 'china' ? 'Chine' : 'Dubaï'})`,
          };
        }
        return { allowed: true };
      },

      addItem: (item) => {
        const { items, canAdd } = get();

        // Check duplicate
        if (items.some((i) => i.vehicleId === item.vehicleId)) {
          return { success: false, error: 'Ce véhicule est déjà dans votre panier' };
        }

        const check = canAdd(item.vehicleSource);
        if (!check.allowed) {
          return { success: false, error: check.reason };
        }

        set({ items: [...items, { ...item, addedAt: Date.now() }] });
        return { success: true };
      },

      removeItem: (vehicleId) =>
        set((state) => ({
          items: state.items.filter((i) => i.vehicleId !== vehicleId),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => () => {
        useCartStore.setState({ _hasHydrated: true });
      },
    }
  )
);
