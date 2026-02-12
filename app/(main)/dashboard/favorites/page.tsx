'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatUsdToLocal } from '@/lib/utils/currency';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Heart,
  Car,
  Search,
} from 'lucide-react';
import type { Vehicle } from '@/types/vehicle';

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

interface FavoriteWithVehicle {
  id: string;
  vehicles: Vehicle | null;
}

export default function FavoritesPage() {
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState<FavoriteWithVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) return;

      try {
        const response = await fetch('/api/favorites');
        if (!response.ok) {
          throw new Error('Erreur de chargement');
        }
        const data = await response.json();
        setFavorites(data.favorites || []);
      } catch (err) {
        console.error('Favorites fetch error:', err);
        setError('Impossible de charger les favoris');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavorites();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reessayer
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mes favoris</h1>
          <p className="text-[var(--text-muted)]">
            Retrouvez les vehicules que vous avez sauvegardes
          </p>
        </div>
        <Link href="/cars">
          <Button variant="primary" size="sm" leftIcon={<Search className="w-4 h-4" />}>
            Explorer les vehicules
          </Button>
        </Link>
      </div>

      {/* Favorites Count */}
      <Card className="bg-red-500/5 border-red-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {favorites.length} vehicule{favorites.length !== 1 ? 's' : ''} sauvegarde{favorites.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Ajoutez des vehicules a vos favoris pour les retrouver facilement
            </p>
          </div>
        </div>
      </Card>

      {/* Favorites Grid */}
      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite) => {
            const vehicle = favorite.vehicles as Vehicle | null;
            if (!vehicle) return null;

            return (
              <Card key={favorite.id} className="overflow-hidden">
                {/* Vehicle Image */}
                <div className="relative h-40 bg-[var(--surface)]">
                  {vehicle.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getProxiedImageUrl(vehicle.images[0])}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Car className="w-12 h-12 text-[var(--text-muted)]" />
                    </div>
                  )}
                  {/* Source Flag */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full">
                    <span className="text-sm">{SOURCE_FLAGS[vehicle.source] || '🚗'}</span>
                  </div>
                  {/* Heart Icon */}
                  <button className="absolute top-2 right-2 p-2 bg-black/50 backdrop-blur-sm rounded-full text-red-500">
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Vehicle Info */}
                <div className="p-4">
                  <h3 className="font-bold text-[var(--text-primary)] truncate">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                    <span>{vehicle.year}</span>
                    {vehicle.mileage && (
                      <>
                        <span>•</span>
                        <span>{vehicle.mileage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} km</span>
                      </>
                    )}
                  </div>

                  {/* Price */}
                  <p className="text-lg font-bold text-mandarin mt-2">
                    {vehicle.current_price_usd
                      ? formatUsdToLocal(vehicle.current_price_usd)
                      : vehicle.start_price_usd
                        ? formatUsdToLocal(vehicle.start_price_usd)
                        : 'Prix sur demande'}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Link href={`/cars/${vehicle.id}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        Voir details
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <Heart className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Aucun favori
          </h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Vous n'avez pas encore de vehicules favoris.
            Parcourez notre catalogue et ajoutez des vehicules a vos favoris.
          </p>
          <Link href="/cars">
            <Button variant="primary">
              Explorer les vehicules
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
