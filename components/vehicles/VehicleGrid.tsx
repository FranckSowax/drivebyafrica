'use client';

import { VehicleCard } from './VehicleCard';
import { LoadingScreen } from '@/components/ui/Spinner';
import type { Vehicle } from '@/types/vehicle';

interface VehicleGridProps {
  vehicles: Vehicle[];
  isLoading?: boolean;
  favorites?: string[];
  onFavorite?: (id: string) => void;
  emptyMessage?: string;
}

export function VehicleGrid({
  vehicles,
  isLoading = false,
  favorites = [],
  onFavorite,
  emptyMessage = 'Aucun véhicule trouvé',
}: VehicleGridProps) {
  if (isLoading) {
    return <LoadingScreen message="Chargement des véhicules..." />;
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-[var(--surface)] rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-[var(--text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-[var(--text-muted)] text-lg">{emptyMessage}</p>
        <p className="text-[var(--text-muted)] opacity-60 text-sm mt-1">
          Essayez de modifier vos filtres de recherche
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.id}
          vehicle={vehicle}
          isFavorite={favorites.includes(vehicle.id)}
          onFavorite={onFavorite}
        />
      ))}
    </div>
  );
}
