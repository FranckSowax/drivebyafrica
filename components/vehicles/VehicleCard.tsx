'use client';

import Link from 'next/link';
import { Heart, Eye, Gauge, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useCurrency, useTranslation } from '@/components/providers/LocaleProvider';
import { parseImagesField } from '@/lib/utils/imageProxy';
import { cn } from '@/lib/utils';
import { getExportTax } from '@/lib/utils/pricing';
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

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-jewel',
  reserved: 'bg-mandarin',
  sold: 'bg-red-500',
  pending: 'bg-royal-blue',
};

export function VehicleCard({ vehicle, onFavorite, isFavorite = false }: VehicleCardProps) {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const vehicleStatus = vehicle.status || 'available';
  const statusBg = STATUS_STYLES[vehicleStatus] || STATUS_STYLES.available;
  const statusLabel = t(`vehicles.card.status.${vehicleStatus}`);
  const isReserved = vehicleStatus === 'reserved';
  const isSold = vehicleStatus === 'sold';
  const images = parseImagesField(vehicle.images);
  const mainImage = images[0] || null;

  return (
    <Link href={`/cars/${vehicle.id}`} className="group block">
      <div className="bg-[var(--card-bg)] rounded-xl overflow-hidden border border-[var(--card-border)] hover:border-mandarin/50 transition-all duration-300 hover:shadow-lg hover:shadow-mandarin/10">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
          <OptimizedImage
            src={mainImage}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Reserved/Sold Overlay */}
          {(isReserved || isSold) && (
            <div className={cn(
              'absolute inset-0 flex items-center justify-center',
              isReserved ? 'bg-mandarin/20' : 'bg-red-500/20'
            )}>
              <span className={cn(
                'px-4 py-2 rounded-lg font-bold text-lg uppercase tracking-wider transform -rotate-12 shadow-lg',
                isReserved ? 'bg-mandarin text-white' : 'bg-red-500 text-white'
              )}>
                {isReserved ? t('vehicles.card.status.reserved') : t('vehicles.card.status.sold')}
              </span>
            </div>
          )}

          {/* Status Badge */}
          <Badge className={cn('absolute top-3 left-3', statusBg)}>
            {statusLabel}
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
              {t('vehicles.card.grade')}: {vehicle.grade}
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
                <span>{vehicle.mileage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} km</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{t(`vehicles.card.source.${vehicle.source}`)}</span>
            </div>
          </div>

          {/* Price - includes export tax silently for Chinese vehicles */}
          <div className="mt-4">
            <p className="text-xs text-[var(--text-muted)]">{t('vehicles.card.fobPrice')}</p>
            <p className="text-mandarin font-bold text-xl">
              {(vehicle.start_price_usd || vehicle.buy_now_price_usd || vehicle.current_price_usd)
                ? formatPrice((vehicle.start_price_usd || vehicle.buy_now_price_usd || vehicle.current_price_usd) + getExportTax(vehicle.source))
                : t('vehicles.card.onRequest')}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">
                {t('vehicles.card.freeEstimate')}
              </span>
              <span className="text-sm font-medium text-mandarin group-hover:underline">
                {t('vehicles.card.viewDetail')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
