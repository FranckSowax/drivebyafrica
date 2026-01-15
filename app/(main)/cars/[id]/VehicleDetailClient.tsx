'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Heart,
  Share2,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { ShippingEstimator } from '@/components/vehicles/ShippingEstimator';
import { formatUsdToLocal } from '@/lib/utils/currency';
import { formatMileage, formatEngineSize } from '@/lib/utils/formatters';
import { getProxiedImageUrls, parseImagesField } from '@/lib/utils/imageProxy';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleSource, VehicleStatus } from '@/types/vehicle';

interface VehicleDetailClientProps {
  vehicle: Vehicle;
}

const SOURCE_FLAGS: Record<VehicleSource, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const STATUS_STYLES: Record<VehicleStatus, { bg: string; label: string }> = {
  available: { bg: 'bg-jewel', label: 'Disponible' },
  reserved: { bg: 'bg-mandarin', label: 'Réservé' },
  sold: { bg: 'bg-red-500', label: 'Vendu' },
  pending: { bg: 'bg-royal-blue', label: 'En attente' },
};

const PLACEHOLDER_IMAGE = '/images/placeholder-car.svg';

export function VehicleDetailClient({ vehicle }: VehicleDetailClientProps) {
  const searchParams = useSearchParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();

  // Check if we should auto-open the quote modal (after login redirect)
  const actionParam = searchParams.get('action');
  const shouldAutoOpenQuote = actionParam === 'quote';

  // Transform images through proxy for signed URLs
  const parsedImages = parseImagesField(vehicle.images);
  const images = parsedImages.length > 0 ? getProxiedImageUrls(parsedImages) : [PLACEHOLDER_IMAGE];
  const source = vehicle.source as VehicleSource;

  // Vehicle status
  const vehicleStatus = (vehicle.status || 'available') as VehicleStatus;
  const statusStyle = STATUS_STYLES[vehicleStatus] || STATUS_STYLES.available;
  const isReserved = vehicleStatus === 'reserved';
  const isSold = vehicleStatus === 'sold';

  // Check if image is external (needs unoptimized flag)
  const isImageExternal = (img: string) => img.startsWith('http') || img.includes('/api/image-proxy');

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${vehicle.make} ${vehicle.model}`,
        text: `Découvrez ce ${vehicle.make} ${vehicle.model} ${vehicle.year} sur Driveby Africa`,
        url: window.location.href,
      });
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié!');
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const specs = [
    { icon: Calendar, label: 'Année', value: vehicle.year?.toString() || '-' },
    { icon: Gauge, label: 'Kilométrage', value: formatMileage(vehicle.mileage) },
    { icon: Settings, label: 'Transmission', value: vehicle.transmission || '-' },
    { icon: Fuel, label: 'Carburant', value: vehicle.fuel_type || '-' },
    { icon: Settings, label: 'Cylindrée', value: formatEngineSize(vehicle.engine_cc) },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24 lg:pb-12">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/cars"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour aux véhicules
        </Link>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--surface)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${vehicle.id}-${currentImageIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[currentImageIndex]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    priority
                    unoptimized={isImageExternal(images[currentImageIndex])}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-sm text-white">
                {currentImageIndex + 1} / {images.length}
              </div>

              {/* Reserved/Sold Overlay */}
              {(isReserved || isSold) && (
                <div className={cn(
                  'absolute inset-0 flex items-center justify-center z-10',
                  isReserved ? 'bg-mandarin/20' : 'bg-red-500/20'
                )}>
                  <span className={cn(
                    'px-6 py-3 rounded-xl font-bold text-2xl uppercase tracking-wider transform -rotate-12 shadow-xl',
                    isReserved ? 'bg-mandarin text-white' : 'bg-red-500 text-white'
                  )}>
                    {isReserved ? 'Réservé' : 'Vendu'}
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <Badge className={cn('absolute top-4 left-4', statusStyle.bg)}>
                {statusStyle.label}
              </Badge>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={`thumb-${vehicle.id}-${index}`}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                      currentImageIndex === index
                        ? 'border-mandarin'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <Image
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized={isImageExternal(image)}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Specifications */}
            <Card>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Spécifications</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--surface)] rounded-lg">
                      <spec.icon className="w-5 h-5 text-mandarin" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">{spec.label}</p>
                      <p className="text-[var(--text-primary)] font-medium">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-[var(--card-border)] grid grid-cols-2 gap-4">
                {vehicle.color && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Couleur</p>
                    <p className="text-[var(--text-primary)]">{vehicle.color}</p>
                  </div>
                )}
                {vehicle.body_type && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Carrosserie</p>
                    <p className="text-[var(--text-primary)]">{vehicle.body_type}</p>
                  </div>
                )}
                {vehicle.drive_type && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Transmission</p>
                    <p className="text-[var(--text-primary)]">{vehicle.drive_type}</p>
                  </div>
                )}
                {vehicle.grade && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Note d&apos;inspection</p>
                    <p className="text-jewel font-bold">{vehicle.grade}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Inspection Sheet */}
            {vehicle.auction_sheet_url && (
              <Card>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                  Fiche d&apos;inspection
                </h2>
                <a
                  href={vehicle.auction_sheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-mandarin hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la fiche d&apos;inspection originale
                </a>
              </Card>
            )}
          </div>

          {/* Right Column - Pricing & Actions */}
          <div className="space-y-6">
            {/* Main Info Card */}
            <Card className="sticky top-24">
              {/* Title */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{SOURCE_FLAGS[source]}</span>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                      {vehicle.make} {vehicle.model}
                    </h1>
                  </div>
                  <p className="text-[var(--text-muted)] mt-1">
                    {vehicle.year} {vehicle.lot_number && `• Réf. #${vehicle.lot_number}`}
                  </p>
                </div>
              </div>

              {/* Reserved/Sold Alert */}
              {(isReserved || isSold) && (
                <div className={cn(
                  'rounded-lg p-4 mb-4 border-2',
                  isReserved
                    ? 'bg-mandarin/10 border-mandarin/30'
                    : 'bg-red-500/10 border-red-500/30'
                )}>
                  <p className={cn(
                    'font-bold text-lg',
                    isReserved ? 'text-mandarin' : 'text-red-500'
                  )}>
                    {isReserved ? 'Ce véhicule est réservé' : 'Ce véhicule a été vendu'}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {isReserved
                      ? 'Un acompte a été versé. Contactez-nous pour plus d\'informations.'
                      : 'Ce véhicule n\'est plus disponible.'}
                  </p>
                </div>
              )}

              {/* Price */}
              <div className="bg-[var(--surface)] rounded-lg p-4 mb-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Prix FOB</p>
                  <p className="text-2xl font-bold text-mandarin">
                    {vehicle.start_price_usd
                      ? formatUsdToLocal(vehicle.start_price_usd)
                      : 'Sur demande'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {/* Shipping Estimator */}
                {vehicle.start_price_usd && (
                  <ShippingEstimator
                    vehiclePriceUSD={vehicle.start_price_usd}
                    vehicleSource={source}
                    vehicleId={vehicle.id}
                    vehicleMake={vehicle.make || 'Unknown'}
                    vehicleModel={vehicle.model || 'Unknown'}
                    vehicleYear={vehicle.year || new Date().getFullYear()}
                    autoOpenQuote={shouldAutoOpenQuote}
                  />
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => toggleFavorite(vehicle.id)}
                    leftIcon={
                      <Heart
                        className={cn(
                          'w-4 h-4',
                          isFavorite(vehicle.id) && 'fill-mandarin text-mandarin'
                        )}
                      />
                    }
                  >
                    {isFavorite(vehicle.id) ? 'Favori' : 'Ajouter'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleShare}
                    leftIcon={<Share2 className="w-4 h-4" />}
                  >
                    Partager
                  </Button>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
