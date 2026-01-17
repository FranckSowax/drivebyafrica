import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
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
  FileText,
  MessageCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import type { Order, OrderTracking, QuoteReassignment } from '@/types/database';
import type { Vehicle } from '@/types/vehicle';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  console.log('[OrderDetailPage] Starting page load');

  try {
    const { id } = await params;
    console.log('[OrderDetailPage] Order ID:', id);

    const supabase = await createClient();
    console.log('[OrderDetailPage] Supabase client created');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[OrderDetailPage] User fetch result:', { userId: user?.id, error: userError?.message });

    if (!user) {
      console.log('[OrderDetailPage] No user found, returning notFound');
      notFound();
    }

    // Fetch order
    console.log('[OrderDetailPage] Fetching order...');
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    console.log('[OrderDetailPage] Order fetch result:', {
      orderId: order?.id,
      orderStatus: order?.status,
      vehicleId: order?.vehicle_id,
      error: error?.message
    });

    if (error || !order) {
      console.log('[OrderDetailPage] Order not found or error, returning notFound');
      notFound();
    }

    const orderData = order as Order;

    // Fetch vehicle, tracking, and check for existing reassignment
    console.log('[OrderDetailPage] Fetching related data...');
    const [vehicleResult, trackingResult, reassignmentResult] = await Promise.all([
      supabase.from('vehicles').select('*').eq('id', orderData.vehicle_id).maybeSingle(),
      supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', id)
        .order('completed_at', { ascending: true }),
      // Check if a reassignment already exists for this order's quote
      orderData.quote_id
        ? supabase
            .from('quote_reassignments')
            .select('*')
            .eq('original_quote_id', orderData.quote_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    console.log('[OrderDetailPage] Vehicle result:', {
      found: !!vehicleResult.data,
      error: vehicleResult.error?.message
    });
    console.log('[OrderDetailPage] Tracking result:', {
      count: trackingResult.data?.length,
      error: trackingResult.error?.message
    });
    console.log('[OrderDetailPage] Reassignment result:', {
      found: !!reassignmentResult.data,
      error: (reassignmentResult as { error?: { message: string } }).error?.message
    });

    const vehicleData = vehicleResult.data as Vehicle | null;
    const trackingData = (trackingResult.data || []) as OrderTracking[];
    const reassignmentData = reassignmentResult.data as QuoteReassignment | null;
    console.log('[OrderDetailPage] Order status value:', orderData.status);
    const orderStatus = orderData.status as OrderStatus;
    const status = orderStatus && ORDER_STATUSES[orderStatus]
      ? ORDER_STATUSES[orderStatus]
      : { label: orderData.status || 'Inconnu', color: 'bg-gray-500', step: 0 };
    console.log('[OrderDetailPage] Resolved status:', JSON.stringify(status));

    // Note: Auto-reassignment is disabled to avoid RLS issues
    // The reassignment should be created via the admin panel instead
    // If vehicle is not available, just show the warning message

    let createdAt = '-';
    try {
      if (orderData.created_at) {
        createdAt = format(new Date(orderData.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr });
      }
    } catch (dateError) {
      console.error('[OrderDetailPage] Date format error:', dateError);
    }

    console.log('[OrderDetailPage] Order data summary:', {
      vehiclePriceUsd: orderData.vehicle_price_usd,
      shippingPriceUsd: orderData.shipping_price_usd,
      insurancePriceUsd: orderData.insurance_price_usd,
      customsEstimateUsd: orderData.customs_estimate_usd,
      totalPriceUsd: orderData.total_price_usd,
      destinationCountry: orderData.destination_country,
      destinationCity: orderData.destination_city,
      destinationPort: orderData.destination_port,
    });
    console.log('[OrderDetailPage] Rendering page...');

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
                <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
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
            <OrderTimeline tracking={trackingData} currentStatus={orderData.status} />
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
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <Card>
            <h2 className="font-bold text-[var(--text-primary)] mb-4">Récapitulatif</h2>
            <div className="space-y-3">
              <PriceRow
                label="Prix du véhicule"
                value={orderData.vehicle_price_usd}
              />
              <PriceRow
                label="Transport"
                value={orderData.shipping_price_usd}
              />
              <PriceRow
                label="Assurance"
                value={orderData.insurance_price_usd}
              />
              <PriceRow
                label="Douane (estimé)"
                value={orderData.customs_estimate_usd}
              />
              <div className="pt-3 border-t border-nobel/20">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-primary)] font-bold">Total</span>
                  <span className="text-xl font-bold text-mandarin">
                    {orderData.total_price_usd
                      ? formatUsdToLocal(orderData.total_price_usd)
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h2 className="font-bold text-[var(--text-primary)] mb-4">Actions</h2>
            <div className="space-y-3">
              {orderData.status === 'pending_payment' && (
                <Link href={`/dashboard/orders/${orderData.id}/pay`}>
                  <Button variant="primary" className="w-full">
                    Payer maintenant
                  </Button>
                </Link>
              )}
              <Link href={`/dashboard/messages?order=${orderData.id}`}>
                <Button
                  variant="outline"
                  className="w-full"
                  leftIcon={<MessageCircle className="w-4 h-4" />}
                >
                  Contacter le support
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full"
                leftIcon={<FileText className="w-4 h-4" />}
              >
                Télécharger les documents
              </Button>
            </div>
          </Card>

          {/* Need Help */}
          <Card className="bg-surface/50">
            <p className="text-sm text-[var(--text-muted)]">
              Besoin d&apos;aide avec votre commande?
            </p>
            <p className="text-sm text-[var(--text-primary)] mt-1">
              Contactez-nous via WhatsApp pour une assistance rapide.
            </p>
            <a
              href="https://wa.me/+24177000000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-jewel text-sm mt-3 hover:underline"
            >
              <MessageCircle className="w-4 h-4" />
              +241 77 00 00 00
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('[OrderDetailPage] FATAL ERROR:', error);
    console.error('[OrderDetailPage] Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw error; // Re-throw to show error page
  }
}

function PriceRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-[var(--text-primary)]">
        {value ? formatUsdToLocal(value) : '-'}
      </span>
    </div>
  );
}
