'use client';

import { VehicleCard } from './VehicleCard';
import { LoadingScreen } from '@/components/ui/Spinner';
import { RefreshCw, AlertCircle, Car } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Vehicle } from '@/types/vehicle';

interface VehicleGridProps {
  vehicles: Vehicle[];
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error?: Error | null;
  favorites?: string[];
  onFavorite?: (id: string) => void;
  onRetry?: () => void;
  emptyMessage?: string;
}

export function VehicleGrid({
  vehicles,
  isLoading = false,
  isFetching = false,
  isError = false,
  error,
  favorites = [],
  onFavorite,
  onRetry,
  emptyMessage = 'Aucun véhicule trouvé',
}: VehicleGridProps) {
  // Initial loading state
  if (isLoading && vehicles.length === 0) {
    return <LoadingScreen message="Chargement des véhicules..." />;
  }

  // Error state with retry option
  if (isError && vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <p className="text-[var(--text-primary)] text-lg font-semibold mb-2">
          Erreur de chargement
        </p>
        <p className="text-[var(--text-muted)] text-sm mb-4 max-w-md">
          {error?.message || 'Impossible de charger les véhicules. Vérifiez votre connexion internet.'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  // Empty state (no vehicles found)
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-[var(--surface)] rounded-full flex items-center justify-center mb-4">
          <Car className="w-12 h-12 text-[var(--text-muted)]" />
        </div>
        <p className="text-[var(--text-muted)] text-lg">{emptyMessage}</p>
        <p className="text-[var(--text-muted)] opacity-60 text-sm mt-1">
          Essayez de modifier vos filtres de recherche
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Fetching indicator overlay (shows when refreshing with existing data) */}
      {isFetching && vehicles.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-center">
          <div className="bg-mandarin/90 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Mise à jour...
          </div>
        </div>
      )}

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
    </div>
  );
}
