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
  MapPin,
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

const SOURCE_NAMES: Record<VehicleSource, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
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
    { icon: MapPin, label: 'Origine', value: SOURCE_NAMES[source] || '-' },
  ];

  return (
    <div className="min-h-screen bg-cod-gray pb-24 lg:pb-12">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/cars"
          className="inline-flex items-center gap-2 text-nobel hover:text-white transition-colors"
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
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface">
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
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Specifications */}
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">Spécifications</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex items-start gap-3">
                    <div className="p-2 bg-surface rounded-lg">
                      <spec.icon className="w-5 h-5 text-mandarin" />
                    </div>
                    <div>
                      <p className="text-xs text-nobel">{spec.label}</p>
                      <p className="text-white font-medium">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-nobel/20 grid grid-cols-2 gap-4">
                {vehicle.color && (
                  <div>
                    <p className="text-xs text-nobel">Couleur</p>
                    <p className="text-white">{vehicle.color}</p>
                  </div>
                )}
                {vehicle.body_type && (
                  <div>
                    <p className="text-xs text-nobel">Carrosserie</p>
                    <p className="text-white">{vehicle.body_type}</p>
                  </div>
                )}
                {vehicle.drive_type && (
                  <div>
                    <p className="text-xs text-nobel">Transmission</p>
                    <p className="text-white">{vehicle.drive_type}</p>
                  </div>
                )}
                {vehicle.grade && (
                  <div>
                    <p className="text-xs text-nobel">Note d&apos;enchère</p>
                    <p className="text-jewel font-bold">{vehicle.grade}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Auction Sheet */}
            {vehicle.auction_sheet_url && (
              <Card>
                <h2 className="text-xl font-bold text-white mb-4">
                  Fiche d&apos;enchère
                </h2>
                <a
                  href={vehicle.auction_sheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-mandarin hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la fiche d&apos;enchère originale
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
                  <span className="text-2xl mr-2">{SOURCE_FLAGS[source]}</span>
                  <h1 className="text-2xl font-bold text-white inline">
                    {vehicle.make} {vehicle.model}
                  </h1>
                  <p className="text-nobel mt-1">
                    {vehicle.year} • {vehicle.lot_number && `Lot #${vehicle.lot_number}`}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-surface rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-nobel">Prix de départ</p>
                    <p className="text-2xl font-bold text-mandarin">
                      {vehicle.start_price_usd
                        ? formatUsdToLocal(vehicle.start_price_usd)
                        : '-'}
                    </p>
                  </div>
                  {vehicle.current_price_usd &&
                    vehicle.current_price_usd > (vehicle.start_price_usd || 0) && (
                      <div className="text-right">
                        <p className="text-xs text-nobel">Enchère actuelle</p>
                        <p className="text-xl font-bold text-jewel">
                          {formatUsdToLocal(vehicle.current_price_usd)}
                        </p>
                      </div>
                    )}
                </div>

                {vehicle.buy_now_price_usd && (
                  <div className="mt-3 pt-3 border-t border-nobel/20">
                    <p className="text-xs text-nobel">Achat immédiat</p>
                    <p className="text-lg font-bold text-royal-blue">
                      {formatUsdToLocal(vehicle.buy_now_price_usd)}
                    </p>
                  </div>
                )}
              </div>

              {/* Auction Info */}
              {vehicle.auction_date && (
                <div className="flex items-center gap-2 mb-4 text-nobel">
                  <Calendar className="w-4 h-4" />
                  <span>Enchère le {formatDate(vehicle.auction_date)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {vehicle.auction_status === 'ongoing' ? (
                  <Link href={`/auctions/${vehicle.id}`}>
                    <Button variant="primary" className="w-full" size="lg">
                      Participer à l&apos;enchère
                    </Button>
                  </Link>
                ) : vehicle.auction_status === 'upcoming' ? (
                  <Button variant="primary" className="w-full" size="lg">
                    M&apos;alerter pour cette enchère
                  </Button>
                ) : null}

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

              {/* Platform Info */}
              <div className="mt-4 pt-4 border-t border-nobel/20 text-sm text-nobel">
                <p>
                  Plateforme:{' '}
                  <span className="text-white">{vehicle.auction_platform || '-'}</span>
                </p>
                {vehicle.source_url && (
                  <a
                    href={vehicle.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-mandarin hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Voir sur la source
                  </a>
                )}
              </div>
            </Card>

            {/* Price Calculator Placeholder */}
            <Card>
              <h3 className="font-bold text-white mb-3">Estimation totale</h3>
              <p className="text-sm text-nobel mb-4">
                Calculez le coût total incluant le transport et les frais de douane.
              </p>
              <Button variant="secondary" className="w-full">
                Calculer le prix total
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
