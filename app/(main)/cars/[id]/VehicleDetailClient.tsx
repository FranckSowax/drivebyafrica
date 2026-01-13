'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
import { formatDate, formatMileage, formatEngineSize } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleSource, AuctionStatus } from '@/types/vehicle';

interface VehicleDetailClientProps {
  vehicle: Vehicle;
}

const SOURCE_FLAGS: Record<VehicleSource, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const STATUS_STYLES: Record<AuctionStatus, { bg: string; label: string }> = {
  upcoming: { bg: 'bg-royal-blue', label: 'À venir' },
  ongoing: { bg: 'bg-mandarin animate-pulse', label: 'En cours' },
  sold: { bg: 'bg-red-500', label: 'Vendu' },
  ended: { bg: 'bg-nobel', label: 'Terminé' },
};

export function VehicleDetailClient({ vehicle }: VehicleDetailClientProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();

  const images = vehicle.images || ['/images/placeholder-car.jpg'];
  const status = STATUS_STYLES[vehicle.auction_status as AuctionStatus] || STATUS_STYLES.upcoming;
  const source = vehicle.source as VehicleSource;

  // Check if images are external with signatures (byteimg.com) - need unoptimized
  const isExternalImage = (img: string) => img.includes('byteimg.com') || img.includes('x-expires');

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
                  key={currentImageIndex}
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
                    unoptimized={isExternalImage(images[currentImageIndex])}
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

              {/* Status Badge */}
              <Badge className={cn('absolute top-4 left-4', status.bg)}>
                {status.label}
              </Badge>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
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
                      unoptimized={isExternalImage(image)}
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
