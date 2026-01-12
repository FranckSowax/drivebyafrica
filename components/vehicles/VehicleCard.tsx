'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Eye, Calendar, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatUsdToLocal } from '@/lib/utils/currency';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleSource, AuctionStatus } from '@/types/vehicle';

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

const STATUS_STYLES: Record<AuctionStatus, { bg: string; label: string }> = {
  upcoming: { bg: 'bg-royal-blue', label: 'À venir' },
  ongoing: { bg: 'bg-mandarin', label: 'En cours' },
  sold: { bg: 'bg-red-500', label: 'Vendu' },
  ended: { bg: 'bg-nobel', label: 'Terminé' },
};

export function VehicleCard({ vehicle, onFavorite, isFavorite = false }: VehicleCardProps) {
  const status = STATUS_STYLES[vehicle.auction_status as AuctionStatus] || STATUS_STYLES.upcoming;
  const mainImage = vehicle.images?.[0] || '/images/placeholder-car.jpg';

  return (
    <Link href={`/cars/${vehicle.id}`} className="group block">
      <div className="bg-cod-gray rounded-xl overflow-hidden border border-nobel/20 hover:border-mandarin/50 transition-all duration-300 hover:shadow-lg hover:shadow-mandarin/5">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <Image
            src={mainImage}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-cod-gray/80 via-transparent to-transparent" />

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
            <span>{vehicle.views_count}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-bold text-white text-lg truncate group-hover:text-mandarin transition-colors">
            {vehicle.make} {vehicle.model}
          </h3>

          {/* Specs */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm text-nobel">
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

          {/* Mileage & Auction Date */}
          <div className="flex items-center gap-4 mt-3 text-sm text-nobel">
            {vehicle.mileage && (
              <div className="flex items-center gap-1">
                <Gauge className="w-4 h-4" />
                <span>{vehicle.mileage.toLocaleString()} km</span>
              </div>
            )}
            {vehicle.auction_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatRelativeTime(vehicle.auction_date)}</span>
              </div>
            )}
          </div>

          {/* Prices */}
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-xs text-nobel">Prix départ</p>
              <p className="text-mandarin font-bold text-lg">
                {vehicle.start_price_usd
                  ? formatUsdToLocal(vehicle.start_price_usd)
                  : '-'}
              </p>
            </div>
            {vehicle.current_price_usd && vehicle.current_price_usd > (vehicle.start_price_usd || 0) && (
              <div className="text-right">
                <p className="text-xs text-nobel">Enchère actuelle</p>
                <p className="text-jewel font-bold">
                  {formatUsdToLocal(vehicle.current_price_usd)}
                </p>
              </div>
            )}
          </div>

          {/* Auction Info */}
          <div className="mt-3 pt-3 border-t border-nobel/20 flex justify-between text-xs text-nobel">
            <span>{vehicle.auction_platform || 'Enchère'}</span>
            {vehicle.lot_number && <span>Lot #{vehicle.lot_number}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
