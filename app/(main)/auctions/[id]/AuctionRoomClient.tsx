'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  ExternalLink,
  Info,
  FileText,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { formatCurrency } from '@/lib/utils/currency';
import { formatMileage, formatEngineSize } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { LiveBidding } from '@/components/auction/LiveBidding';
import { LiveIndicator, AuctionStatusPill } from '@/components/auction/AuctionStatus';
import type { Vehicle, VehicleSource } from '@/types/vehicle';
import type { Bid } from '@/types/database';

interface AuctionRoomClientProps {
  vehicle: Vehicle;
  initialBids: Bid[];
}

const SOURCE_FLAGS: Record<VehicleSource, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

export function AuctionRoomClient({ vehicle, initialBids }: AuctionRoomClientProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'specs' | 'sheet'>('specs');
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();

  const images = vehicle.images || ['/images/placeholder-car.jpg'];
  const source = vehicle.source as VehicleSource;
  const isLive = vehicle.auction_status === 'ongoing';

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Enchère: ${vehicle.make} ${vehicle.model}`,
        text: `Enchérissez sur ce ${vehicle.make} ${vehicle.model} ${vehicle.year} sur Driveby Africa`,
        url: window.location.href,
      });
    } catch {
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

  return (
    <div className="min-h-screen bg-cod-gray pb-24 lg:pb-12">
      {/* Header */}
      <div className="sticky top-16 z-40 bg-cod-gray/95 backdrop-blur-sm border-b border-nobel/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/cars"
                className="flex items-center gap-1 text-nobel hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Retour
              </Link>

              <div className="hidden sm:flex items-center gap-2">
                {isLive && <LiveIndicator />}
                <AuctionStatusPill status={vehicle.auction_status} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
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
                <span className="hidden sm:inline">Favoris</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Partager</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title (Mobile) */}
            <div className="lg:hidden">
              <div className="flex items-center gap-2 mb-2">
                {isLive && <LiveIndicator />}
                <AuctionStatusPill status={vehicle.auction_status} />
              </div>
              <h1 className="text-2xl font-bold text-white">
                <span className="mr-2">{SOURCE_FLAGS[source]}</span>
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-nobel">
                {vehicle.year} • Lot #{vehicle.lot_number}
              </p>
            </div>

            {/* Image Gallery */}
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-surface">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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

              {/* Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-sm text-white">
                {currentImageIndex + 1} / {images.length}
              </div>

              {/* Grade Badge */}
              {vehicle.grade && (
                <Badge className="absolute top-4 left-4 bg-jewel text-white">
                  Grade {vehicle.grade}
                </Badge>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all',
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

            {/* Tabs */}
            <div className="flex gap-2 border-b border-nobel/20">
              <button
                onClick={() => setActiveTab('specs')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === 'specs'
                    ? 'border-mandarin text-mandarin'
                    : 'border-transparent text-nobel hover:text-white'
                )}
              >
                <Car className="w-4 h-4" />
                Spécifications
              </button>
              {vehicle.auction_sheet_url && (
                <button
                  onClick={() => setActiveTab('sheet')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                    activeTab === 'sheet'
                      ? 'border-mandarin text-mandarin'
                      : 'border-transparent text-nobel hover:text-white'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Fiche d&apos;enchère
                </button>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'specs' && (
              <Card>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <SpecItem label="Année" value={vehicle.year?.toString() || '-'} />
                  <SpecItem label="Kilométrage" value={formatMileage(vehicle.mileage)} />
                  <SpecItem label="Cylindrée" value={formatEngineSize(vehicle.engine_cc)} />
                  <SpecItem label="Transmission" value={vehicle.transmission || '-'} />
                  <SpecItem label="Carburant" value={vehicle.fuel_type || '-'} />
                  <SpecItem label="Couleur" value={vehicle.color || '-'} />
                  <SpecItem label="Carrosserie" value={vehicle.body_type || '-'} />
                  <SpecItem label="Traction" value={vehicle.drive_type || '-'} />
                  <SpecItem
                    label="Plateforme"
                    value={vehicle.auction_platform || '-'}
                  />
                </div>

                {vehicle.source_url && (
                  <div className="mt-4 pt-4 border-t border-nobel/20">
                    <a
                      href={vehicle.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-mandarin hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Voir l&apos;annonce originale
                    </a>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'sheet' && vehicle.auction_sheet_url && (
              <Card>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-jewel/10 rounded-lg">
                    <Info className="w-6 h-6 text-jewel" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2">
                      Fiche d&apos;enchère disponible
                    </h3>
                    <p className="text-sm text-nobel mb-4">
                      Cette fiche contient l&apos;historique complet du véhicule,
                      incluant les dommages éventuels et l&apos;évaluation de
                      l&apos;inspecteur.
                    </p>
                    <a
                      href={vehicle.auction_sheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" leftIcon={<ExternalLink className="w-4 h-4" />}>
                        Voir la fiche d&apos;enchère
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Bidding */}
          <div className="space-y-6">
            {/* Title (Desktop) */}
            <div className="hidden lg:block">
              <h1 className="text-2xl font-bold text-white mb-1">
                <span className="mr-2">{SOURCE_FLAGS[source]}</span>
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-nobel">
                {vehicle.year} • Lot #{vehicle.lot_number}
              </p>
            </div>

            {/* Live Bidding Component */}
            <LiveBidding vehicle={vehicle} />

            {/* Price Info */}
            <Card className="space-y-3">
              <h3 className="font-bold text-white">Informations de prix</h3>
              <div className="flex justify-between text-sm">
                <span className="text-nobel">Prix de départ</span>
                <span className="text-white">
                  {vehicle.start_price_usd
                    ? formatCurrency(vehicle.start_price_usd, 'USD')
                    : '-'}
                </span>
              </div>
              {vehicle.buy_now_price_usd && (
                <div className="flex justify-between text-sm">
                  <span className="text-nobel">Achat immédiat</span>
                  <span className="text-royal-blue font-medium">
                    {formatCurrency(vehicle.buy_now_price_usd, 'USD')}
                  </span>
                </div>
              )}
              <p className="text-xs text-nobel pt-2 border-t border-nobel/20">
                Les prix n&apos;incluent pas les frais de transport, assurance
                et douane. Utilisez notre calculateur pour obtenir une estimation
                complète.
              </p>
            </Card>

            {/* Need Help */}
            <Card className="bg-surface">
              <p className="text-sm text-nobel mb-3">
                Besoin d&apos;aide pour enchérir?
              </p>
              <Link href="/contact">
                <Button variant="outline" className="w-full">
                  Contacter un conseiller
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-nobel mb-0.5">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
