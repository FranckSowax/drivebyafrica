'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useToast } from '@/components/ui/Toast';
import { useCartStore } from '@/store/useCartStore';
import { useShippingDestinations } from '@/lib/hooks/useShippingDestinations';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { useAuthStore } from '@/store/useAuthStore';
import {
  calculateMultiVehicleImportCosts,
  DEPOSIT_PER_VEHICLE_USD,
  INSPECTION_FEE_USD,
} from '@/lib/utils/pricing';
import { SOURCE_NAMES, type VehicleSource } from '@/types/vehicle';
import { MultiVehicleQuotePDFModal } from '@/components/vehicles/MultiVehicleQuotePDFModal';

const PLACEHOLDER_IMAGE = '/images/placeholder-car.svg';

export default function CartPage() {
  const router = useRouter();
  const toast = useToast();
  const { formatPrice, getQuoteCurrency } = useCurrency();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const { destinations, isLoading: destinationsLoading } = useShippingDestinations();
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.id === selectedDestinationId) || null,
    [destinations, selectedDestinationId]
  );

  // All items have the same source (enforced by cart store)
  const vehicleSource = items.length > 0 ? items[0].vehicleSource : null;

  // Get 40ft shipping cost for selected destination
  const shippingCost40ftUSD = useMemo(() => {
    if (!selectedDestination || !vehicleSource) return 0;
    return selectedDestination.shippingCost40ft[vehicleSource] || 0;
  }, [selectedDestination, vehicleSource]);

  // Calculate costs
  const quoteCurrency = getQuoteCurrency();
  const xafRate = quoteCurrency.code === 'XAF' ? (quoteCurrency.rateToUsd || 600) : 1;
  const currencyCode = quoteCurrency.code;
  const isXAF = currencyCode === 'XAF';

  const costs = useMemo(() => {
    if (items.length < 2 || !shippingCost40ftUSD) return null;
    return calculateMultiVehicleImportCosts({
      vehicles: items.map((i) => ({
        vehiclePriceUSD: i.vehiclePriceUSD,
      })),
      shippingCost40ftUSD,
      xafRate: isXAF ? xafRate : 1,
    });
  }, [items, shippingCost40ftUSD, xafRate, isXAF]);

  const formatAmount = (amountUsd: number) => {
    return formatPrice(amountUsd);
  };

  const formatCostLine = (amountXafOrUsd: number) => {
    if (!isXAF) {
      return `$${Math.round(amountXafOrUsd).toLocaleString('fr-FR')}`;
    }
    return `${Math.round(amountXafOrUsd).toLocaleString('fr-FR')} FCFA`;
  };

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)]" />
        <h1 className="text-2xl font-bold mb-2">Votre panier est vide</h1>
        <p className="text-[var(--text-muted)] mb-6">
          Ajoutez 2 ou 3 véhicules de la même source pour bénéficier du tarif container 40 pieds.
        </p>
        <Link href="/cars">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Parcourir les véhicules
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-mandarin" />
            Container 40 pieds
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {items.length} véhicule{items.length > 1 ? 's' : ''} - Source : {vehicleSource ? SOURCE_NAMES[vehicleSource] : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/cars')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Continuer
        </Button>
      </div>

      {/* Minimum 2 vehicles notice */}
      {items.length < 2 && (
        <Card className="p-4 mb-6 border-mandarin/30 bg-mandarin/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-mandarin flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Ajoutez au moins 2 véhicules</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Le devis container 40 pieds nécessite 2 ou 3 véhicules de la même source.
                Pour un seul véhicule, utilisez l&apos;estimateur sur la page du véhicule.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Vehicle list */}
      <div className="space-y-3 mb-6">
        {items.map((item, index) => (
          <Card key={item.vehicleId} className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-[var(--surface)]">
                <OptimizedImage
                  src={item.imageUrl || PLACEHOLDER_IMAGE}
                  alt={`${item.vehicleMake} ${item.vehicleModel}`}
                  width={80}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {index + 1}. {item.vehicleMake} {item.vehicleModel} ({item.vehicleYear})
                </p>
                <p className="text-mandarin font-semibold text-sm">
                  {formatAmount(item.vehiclePriceUSD)}
                </p>
              </div>
              <button
                onClick={() => removeItem(item.vehicleId)}
                className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                title="Retirer du panier"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Destination selection */}
      {items.length >= 2 && (
        <Card className="p-4 mb-6">
          <h2 className="font-semibold mb-3">Destination</h2>
          {destinationsLoading ? (
            <div className="h-10 bg-[var(--surface)] animate-pulse rounded" />
          ) : (
            <select
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--text-primary)] text-sm"
            >
              <option value="">Sélectionner une destination</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.flag} {dest.name}, {dest.country}
                </option>
              ))}
            </select>
          )}
        </Card>
      )}

      {/* Price 40ft not available warning */}
      {selectedDestination && vehicleSource && shippingCost40ftUSD === 0 && (
        <Card className="p-4 mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-red-600 dark:text-red-400">
                Tarif container 40 pieds non disponible
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Le tarif 40 pieds n&apos;est pas encore configuré pour {selectedDestination.name} depuis {SOURCE_NAMES[vehicleSource]}.
                Contactez-nous pour un devis personnalisé.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Cost breakdown */}
      {costs && selectedDestination && shippingCost40ftUSD > 0 && (
        <Card className="p-4 mb-6">
          <h2 className="font-semibold mb-3">Estimation des coûts</h2>
          <div className="space-y-2 text-sm">
            {/* Per vehicle prices */}
            {costs.perVehicle.map((pv, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-[var(--text-muted)]">
                  {items[i].vehicleMake} {items[i].vehicleModel}
                </span>
                <span>{formatCostLine(isXAF ? pv.vehiclePriceXAF : pv.vehiclePriceUSD)}</span>
              </div>
            ))}

            <hr className="border-[var(--card-border)]" />

            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                Transport Container 40ft → {selectedDestination.name}
              </span>
              <span>{formatCostLine(isXAF ? costs.shippingCost40ftXAF : costs.shippingCost40ftUSD)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Assurance cargo (2.5%)</span>
              <span>{formatCostLine(costs.insuranceCostXAF)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                Inspection ({INSPECTION_FEE_USD}$ x {costs.vehicleCount})
              </span>
              <span>{formatCostLine(costs.inspectionFeeTotalXAF)}</span>
            </div>

            <hr className="border-[var(--card-border)]" />

            <div className="flex justify-between font-bold text-base">
              <span>Total estimé</span>
              <span className="text-mandarin">{formatCostLine(costs.totalXAF)}</span>
            </div>

            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
              <span>Acompte ({DEPOSIT_PER_VEHICLE_USD.toLocaleString()}$ x {costs.vehicleCount})</span>
              <span className="font-medium">
                {isXAF
                  ? `${costs.depositTotalXAF.toLocaleString('fr-FR')} FCFA`
                  : `$${costs.depositTotalUSD.toLocaleString('fr-FR')}`}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {items.length >= 2 && selectedDestination && shippingCost40ftUSD > 0 && costs && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              if (!user) {
                toast.error('Connectez-vous pour obtenir un devis');
                return;
              }
              setIsQuoteModalOpen(true);
            }}
          >
            Obtenir le devis PDF
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10"
          onClick={() => {
            clearCart();
            toast.success('Panier vidé');
          }}
        >
          Vider le panier
        </Button>
      </div>

      {/* Multi-vehicle quote modal */}
      {isQuoteModalOpen && costs && selectedDestination && vehicleSource && (
        <MultiVehicleQuotePDFModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          items={items}
          destination={selectedDestination}
          vehicleSource={vehicleSource}
          costs={costs}
          shippingCost40ftUSD={shippingCost40ftUSD}
          user={user}
          profile={profile}
          currencyCode={currencyCode}
          xafRate={xafRate}
          onOrderSuccess={() => {
            clearCart();
            router.push('/dashboard/orders');
          }}
        />
      )}
    </div>
  );
}
