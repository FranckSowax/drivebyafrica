'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderDocuments } from '@/components/orders/OrderDocuments';
import { TransitairesSuggestion } from '@/components/orders/TransitairesSuggestion';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import { formatUsdToLocal } from '@/lib/utils/currency';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Package,
  MessageCircle,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { Order, OrderTracking, QuoteReassignment, Quote } from '@/types/database';
import type { Vehicle } from '@/types/vehicle';

const XAF_TO_USD_RATE = 615;

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isInitialized } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  const [orderData, setOrderData] = useState<Order | null>(null);
  const [vehicleData, setVehicleData] = useState<Vehicle | null>(null);
  const [trackingData, setTrackingData] = useState<OrderTracking[]>([]);
  const [quoteData, setQuoteData] = useState<Quote | null>(null);
  const [reassignmentData, setReassignmentData] = useState<QuoteReassignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login?redirect=/dashboard/orders');
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchData = async () => {
      setIsLoading(true);

      // Fetch order
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !order) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const o = order as Order;
      setOrderData(o);

      // Fetch related data in parallel
      const [vehicleResult, trackingResult, quoteResult, reassignmentResult] = await Promise.all([
        supabase.from('vehicles').select('*').eq('id', o.vehicle_id).maybeSingle(),
        supabase
          .from('order_tracking')
          .select('*')
          .eq('order_id', id)
          .order('completed_at', { ascending: true }),
        o.quote_id
          ? supabase.from('quotes').select('*').eq('id', o.quote_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        o.quote_id
          ? supabase.from('quote_reassignments').select('*').eq('original_quote_id', o.quote_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      setVehicleData(vehicleResult.data as Vehicle | null);
      setTrackingData((trackingResult.data || []) as OrderTracking[]);
      setQuoteData(quoteResult.data as Quote | null);
      setReassignmentData(reassignmentResult.data as QuoteReassignment | null);
      setIsLoading(false);
    };

    fetchData();

    // Real-time subscription for tracking updates
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_tracking',
        filter: `order_id=eq.${id}`,
      }, () => { fetchData(); })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id}`,
      }, () => { fetchData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, id]);

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  if (notFound || !orderData) {
    return (
      <div className="text-center py-20">
        <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Commande introuvable</h2>
        <p className="text-[var(--text-muted)] mb-6">Cette commande n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <Link href="/dashboard/orders" className="text-mandarin hover:underline">
          Retour aux commandes
        </Link>
      </div>
    );
  }

  const shippingPriceUsd = orderData.shipping_price_usd ||
    (quoteData?.shipping_cost_xaf ? Math.round(quoteData.shipping_cost_xaf / XAF_TO_USD_RATE) : null);
  const insurancePriceUsd = orderData.insurance_price_usd ||
    (quoteData?.insurance_cost_xaf ? Math.round(quoteData.insurance_cost_xaf / XAF_TO_USD_RATE) : null);

  const orderStatus = orderData.status as OrderStatus;
  const status = orderStatus && ORDER_STATUSES[orderStatus]
    ? ORDER_STATUSES[orderStatus]
    : { label: orderData.status || 'Inconnu', color: 'bg-gray-500', step: 0 };

  let createdAt = '-';
  try {
    if (orderData.created_at) {
      createdAt = format(new Date(orderData.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr });
    }
  } catch {
    // ignore date format errors
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour aux commandes
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Commande #{orderData.id.slice(-6).toUpperCase()}
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Creee le {createdAt}</p>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Info */}
          <Card>
            <h2 className="font-bold text-[var(--text-primary)] mb-4">Véhicule</h2>
            {vehicleData ? (
              <div className="flex gap-4">
                <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-nobel/10">
                  {vehicleData.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getProxiedImageUrl(vehicleData.images[0])}
                      alt={`${vehicleData.make} ${vehicleData.model}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {vehicleData.make} {vehicleData.model}
                  </h3>
                  <p className="text-[var(--text-muted)]">
                    {vehicleData.year} • Lot #{vehicleData.lot_number || '-'}
                  </p>
                  <Link
                    href={`/cars/${vehicleData.id}`}
                    className="inline-flex items-center gap-1 text-sm text-mandarin hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Voir le véhicule
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-full">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-yellow-500">
                      Véhicule vendu ou retiré
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Ce véhicule n&apos;est plus disponible sur la marketplace d&apos;origine.
                      Il a probablement été vendu ou retiré de la vente.
                    </p>
                    {reassignmentData ? (
                      <div className="mt-3 p-3 bg-mandarin/10 border border-mandarin/30 rounded-lg">
                        <p className="text-sm text-mandarin font-medium">
                          Une demande de réassignation est en cours.
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Notre équipe recherche des véhicules similaires pour vous. Vous serez notifié dès que des alternatives seront disponibles.
                        </p>
                        <Link
                          href={`/reassignment/${reassignmentData.id}`}
                          className="inline-flex items-center gap-1 text-sm text-mandarin hover:underline mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Voir les alternatives proposées
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-400 font-medium">
                          Notre équipe a été notifiée
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Nous recherchons des véhicules similaires pour vous. Vous serez contacté dès que des alternatives seront disponibles.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Tracking Timeline */}
          <Card>
            <h2 className="font-bold text-[var(--text-primary)] mb-6">Suivi de la commande</h2>
            <OrderTimeline
              tracking={trackingData}
              currentStatus={orderData.status}
              documents={orderData.uploaded_documents}
            />
          </Card>

          {/* Shipping Details */}
          <Card>
            <h2 className="font-bold text-[var(--text-primary)] mb-4">Détails de livraison</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Destination</p>
                <p className="text-[var(--text-primary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-mandarin" />
                  {orderData.destination_city || orderData.destination_port || '-'}
                  {orderData.destination_country && `, ${orderData.destination_country}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Méthode</p>
                <p className="text-[var(--text-primary)] capitalize">
                  {orderData.shipping_method === 'roro' ? 'RoRo' :
                   orderData.shipping_method?.includes('container') ? 'Container' :
                   orderData.shipping_method === 'sea' ? 'Maritime' : 'Maritime'}
                  {orderData.container_type && ` (${orderData.container_type})`}
                </p>
              </div>
              {orderData.tracking_number && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Numéro de suivi</p>
                  <p className="text-[var(--text-primary)] font-mono">{orderData.tracking_number}</p>
                </div>
              )}
              {orderData.estimated_arrival && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Arrivée estimée</p>
                  <p className="text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-mandarin" />
                    {format(new Date(orderData.estimated_arrival), 'd MMMM yyyy', {
                      locale: fr,
                    })}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Transitaires Suggestion */}
          <TransitairesSuggestion
            destinationCountry={orderData.destination_country || ''}
            destinationPort={orderData.destination_port || undefined}
            orderId={orderData.id}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <Card>
            <h2 className="font-bold text-[var(--text-primary)] mb-4">Récapitulatif</h2>
            <div className="space-y-3">
              <PriceRow label="Prix du véhicule" value={orderData.vehicle_price_usd} />
              <PriceRow label="Transport maritime" value={shippingPriceUsd} showDash />
              <PriceRow label="Assurance tous risques" value={insurancePriceUsd} showDash />
              <PriceRow label="Documentation" value={orderData.documentation_fee_usd || 150} />
              <div className="pt-3 border-t border-nobel/20">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-primary)] font-bold">Total</span>
                  <span className="text-xl font-bold text-mandarin">
                    {formatUsdToLocal(
                      orderData.total_price_usd ||
                      (orderData.vehicle_price_usd || 0) +
                      (shippingPriceUsd || 0) +
                      (insurancePriceUsd || 0) +
                      (orderData.documentation_fee_usd || 150)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Documents */}
          <Card>
            <h2 className="font-bold text-[var(--text-primary)] mb-4">Documents</h2>
            <OrderDocuments
              documents={orderData.uploaded_documents || []}
              documentsSentAt={orderData.documents_sent_at}
            />
          </Card>

          {/* Need Help */}
          <Card className="bg-nobel/10">
            <p className="text-sm text-[var(--text-muted)]">
              Besoin d&apos;aide avec votre commande?
            </p>
            <p className="text-sm text-[var(--text-primary)] mt-1">
              Notre équipe est disponible pour répondre à vos questions.
            </p>
            <Link
              href={`/dashboard/messages?order=${orderData.id}`}
              className="inline-flex items-center gap-2 text-mandarin text-sm mt-3 hover:underline"
            >
              <MessageCircle className="w-4 h-4" />
              Envoyer un message
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  showDash = false,
}: {
  label: string;
  value: number | null | undefined;
  showDash?: boolean;
}) {
  const displayValue = value && value > 0
    ? formatUsdToLocal(value)
    : showDash ? '-' : formatUsdToLocal(0);

  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-[var(--text-primary)]">{displayValue}</span>
    </div>
  );
}
