'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Eye, Gauge, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatUsdToLocal } from '@/lib/utils/currency';
import { getProxiedImageUrl, parseImagesField } from '@/lib/utils/imageProxy';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleSource } from '@/types/vehicle';

interface VehicleCardProps {
  vehicle: Vehicle;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

const SOURCE_FLAGS: Record<VehicleSource, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const SOURCE_LABELS: Record<VehicleSource, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  available: { bg: 'bg-jewel', label: 'Disponible' },
  reserved: { bg: 'bg-mandarin', label: 'Réservé' },
  sold: { bg: 'bg-red-500', label: 'Vendu' },
  pending: { bg: 'bg-royal-blue', label: 'En attente' },
};

export function VehicleCard({ vehicle, onFavorite, isFavorite = false }: VehicleCardProps) {
  const status = STATUS_STYLES[vehicle.status || 'available'] || STATUS_STYLES.available;
  const images = parseImagesField(vehicle.images);
  const rawImage = images[0];
  const mainImage = rawImage ? getProxiedImageUrl(rawImage) : '/images/placeholder-car.svg';

  return (
    <Link href={`/cars/${vehicle.id}`} className="group block">
      <div className="bg-[var(--card-bg)] rounded-xl overflow-hidden border border-[var(--card-border)] hover:border-mandarin/50 transition-all duration-300 hover:shadow-lg hover:shadow-mandarin/10">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
          <Image
            src={mainImage}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status Badge */}
          <Badge className={cn('absolute top-3 left-3', status.bg)}>
            {status.label}
          </Badge>

          {/* Source Flag */}
          <span className="absolute top-3 right-12 text-2xl drop-shadow-lg">
            {SOURCE_FLAGS[vehicle.source as VehicleSource]}
          </span>

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite?.(vehicle.id);
            }}
            className={cn(
              'absolute top-3 right-3 p-2 rounded-full transition-all duration-200',
              isFavorite
                ? 'bg-mandarin text-white'
                : 'bg-black/50 text-white hover:bg-mandarin'
            )}
          >
            <Heart
              className="w-5 h-5"
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </button>

          {/* Grade Badge */}
          {vehicle.grade && (
            <Badge className="absolute bottom-3 right-3 bg-jewel">
              Note: {vehicle.grade}
            </Badge>
          )}

          {/* Views */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-white/80">
            <Eye className="w-3.5 h-3.5" />
            <span>{vehicle.views_count || 0}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-bold text-[var(--text-primary)] text-lg truncate group-hover:text-mandarin transition-colors">
            {vehicle.make} {vehicle.model}
          </h3>

          {/* Specs */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm text-[var(--text-muted)]">
            <span>{vehicle.year}</span>
            <span>•</span>
            <span>{vehicle.transmission}</span>
            {vehicle.engine_cc && (
              <>
                <span>•</span>
                <span>{vehicle.engine_cc}cc</span>
              </>
            )}
          </div>

          {/* Mileage & Source */}
          <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
            {vehicle.mileage && (
              <div className="flex items-center gap-1">
                <Gauge className="w-4 h-4" />
                <span>{vehicle.mileage.toLocaleString()} km</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{SOURCE_LABELS[vehicle.source as VehicleSource] || vehicle.source}</span>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4">
            <p className="text-xs text-[var(--text-muted)]">Prix FOB</p>
            <p className="text-mandarin font-bold text-xl">
              {vehicle.start_price_usd
                ? formatUsdToLocal(vehicle.start_price_usd)
                : 'Sur demande'}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">
                Estimation gratuite
              </span>
              <span className="text-sm font-medium text-mandarin group-hover:underline">
                Voir le détail →
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
