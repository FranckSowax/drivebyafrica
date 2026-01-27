'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Share2,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  ChevronLeft,
  ChevronRight,
  Package,
  Boxes,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useToast } from '@/components/ui/Toast';
import { BatchShippingEstimator } from './BatchShippingEstimator';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { formatMileage, formatEngineSize } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { getExportTax } from '@/lib/utils/pricing';
import type { VehicleBatch } from '@/types/vehicle-batch';

interface BatchDetailClientProps {
  batch: VehicleBatch;
}

type SourceCountry = 'korea' | 'china' | 'dubai';

const SOURCE_FLAGS: Record<SourceCountry, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const SOURCE_NAMES: Record<SourceCountry, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

const PLACEHOLDER_IMAGE = '/images/placeholder-car.svg';

export function BatchDetailClient({ batch }: BatchDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(batch.minimum_order_quantity);
  const toast = useToast();
  const { formatPrice } = useCurrency();

  // Check if we should auto-open the quote modal (after login redirect)
  const actionParam = searchParams.get('action');
  const shouldAutoOpenQuote = actionParam === 'quote';

  // Parse images
  const images = batch.images && batch.images.length > 0 ? batch.images : [batch.thumbnail_url || PLACEHOLDER_IMAGE];
  const source = batch.source_country as SourceCountry;

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${batch.make} ${batch.model} - Lot de ${batch.available_quantity} véhicules`,
        text: `Découvrez ce lot de ${batch.available_quantity} ${batch.make} ${batch.model} ${batch.year} sur Driveby Africa`,
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

  const handleQuantityChange = (value: number) => {
    if (value >= batch.minimum_order_quantity && value <= batch.available_quantity) {
      setQuantity(value);
    }
  };

  const specs = [
    { icon: Calendar, label: 'Année', value: batch.year?.toString() || '-' },
    { icon: Gauge, label: 'Kilométrage', value: formatMileage(batch.mileage) },
    { icon: Settings, label: 'Transmission', value: batch.transmission || '-' },
    { icon: Fuel, label: 'Carburant', value: batch.fuel_type || '-' },
    { icon: Settings, label: 'Cylindrée', value: formatEngineSize(batch.engine_size ? parseInt(batch.engine_size) : null) },
  ];

  // Calculate unit price with export tax (silently included for Chinese vehicles)
  const exportTax = getExportTax(batch.source_country);
  const unitPriceWithTax = batch.price_per_unit_usd + exportTax;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24 lg:pb-12">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/batches"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour aux lots
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
                  key={`${batch.id}-${currentImageIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <OptimizedImage
                    src={images[currentImageIndex]}
                    alt={`${batch.make} ${batch.model}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority={currentImageIndex === 0}
                    className="object-cover"
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

              {/* Batch Badge */}
              <Badge className="absolute top-4 left-4 bg-royal-blue">
                <Boxes className="w-3 h-3 mr-1" />
                Lot de {batch.available_quantity} véhicules
              </Badge>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={`thumb-${batch.id}-${index}`}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                      currentImageIndex === index
                        ? 'border-mandarin'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <OptimizedImage
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      sizes="80px"
                      quality={50}
                      className="object-cover"
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
                {batch.color && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Couleur</p>
                    <p className="text-[var(--text-primary)]">{batch.color}</p>
                  </div>
                )}
                {batch.body_type && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Carrosserie</p>
                    <p className="text-[var(--text-primary)]">{batch.body_type}</p>
                  </div>
                )}
                {batch.drive_type && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Transmission</p>
                    <p className="text-[var(--text-primary)]">{batch.drive_type}</p>
                  </div>
                )}
                {batch.condition && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">État</p>
                    <p className="text-jewel font-bold">{batch.condition}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Description */}
            {batch.description && (
              <Card>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Description</h2>
                <p className="text-[var(--text-muted)] whitespace-pre-line">{batch.description}</p>
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
                      {batch.make} {batch.model}
                    </h1>
                  </div>
                  <p className="text-[var(--text-muted)] mt-1">
                    {batch.year} • {batch.title}
                  </p>
                </div>
              </div>

              {/* Batch Info */}
              <div className="bg-royal-blue/10 border border-royal-blue/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-royal-blue" />
                  <span className="font-bold text-royal-blue">Achat en lot</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[var(--text-muted)]">Disponibles</p>
                    <p className="text-[var(--text-primary)] font-bold">{batch.available_quantity} véhicules</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Minimum</p>
                    <p className="text-[var(--text-primary)] font-bold">{batch.minimum_order_quantity} véhicules</p>
                  </div>
                </div>
              </div>

              {/* Price per Unit */}
              <div className="bg-[var(--surface)] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-mandarin" />
                      <p className="text-xs text-[var(--text-muted)]">Prix unitaire FOB</p>
                    </div>
                    <p className="text-2xl font-bold text-mandarin">
                      {formatPrice(unitPriceWithTax)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">par véhicule</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">Origine</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {SOURCE_NAMES[source]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Quantité souhaitée
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= batch.minimum_order_quantity}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold transition-colors',
                      quantity <= batch.minimum_order_quantity
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[var(--surface)] text-[var(--text-primary)] hover:bg-mandarin hover:text-white'
                    )}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || batch.minimum_order_quantity)}
                    min={batch.minimum_order_quantity}
                    max={batch.available_quantity}
                    className="flex-1 px-4 py-2 text-center text-xl font-bold bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-mandarin"
                  />
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= batch.available_quantity}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold transition-colors',
                      quantity >= batch.available_quantity
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[var(--surface)] text-[var(--text-primary)] hover:bg-mandarin hover:text-white'
                    )}
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Minimum: {batch.minimum_order_quantity} • Maximum: {batch.available_quantity}
                </p>
              </div>

              {/* Subtotal */}
              <div className="bg-mandarin/10 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-primary)] font-medium">
                    Sous-total ({quantity} véhicules)
                  </span>
                  <span className="text-xl font-bold text-mandarin">
                    {formatPrice(unitPriceWithTax * quantity)}
                  </span>
                </div>
              </div>

              {/* Shipping Estimator */}
              <BatchShippingEstimator
                batchId={batch.id}
                unitPriceUSD={batch.price_per_unit_usd}
                batchSource={source}
                batchMake={batch.make}
                batchModel={batch.model}
                batchYear={batch.year}
                quantity={quantity}
                minQuantity={batch.minimum_order_quantity}
                maxQuantity={batch.available_quantity}
                autoOpenQuote={shouldAutoOpenQuote}
              />

              {/* Share Button */}
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleShare}
                  leftIcon={<Share2 className="w-4 h-4" />}
                >
                  Partager ce lot
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
