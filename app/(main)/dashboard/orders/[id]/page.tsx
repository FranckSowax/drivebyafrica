import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import { formatUsdToLocal } from '@/lib/utils/currency';
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
} from 'lucide-react';
import type { Order, OrderTracking } from '@/types/database';
import type { Vehicle } from '@/types/vehicle';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !order) {
    notFound();
  }

  const orderData = order as Order;

  // Fetch vehicle and tracking
  const [{ data: vehicle }, { data: tracking }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', orderData.vehicle_id).single(),
    supabase
      .from('order_tracking')
      .select('*')
      .eq('order_id', id)
      .order('completed_at', { ascending: true }),
  ]);

  const vehicleData = vehicle as Vehicle | null;
  const trackingData = (tracking || []) as OrderTracking[];
  const status = ORDER_STATUSES[orderData.status as OrderStatus] || ORDER_STATUSES.pending_payment;

  const createdAt = format(new Date(orderData.created_at), "d MMMM yyyy 'à' HH:mm", {
    locale: fr,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1 text-nobel hover:text-white transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour aux commandes
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Commande #{orderData.id.slice(-6).toUpperCase()}
          </h1>
          <p className="text-nobel mt-1">Créée le {createdAt}</p>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Info */}
          <Card>
            <h2 className="font-bold text-white mb-4">Véhicule</h2>
            <div className="flex gap-4">
              <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
                {vehicleData?.images?.[0] ? (
                  <Image
                    src={vehicleData.images[0]}
                    alt={`${vehicleData.make} ${vehicleData.model}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-8 h-8 text-nobel" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {vehicleData
                    ? `${vehicleData.make} ${vehicleData.model}`
                    : 'Véhicule'}
                </h3>
                <p className="text-nobel">
                  {vehicleData?.year} • Lot #{vehicleData?.lot_number || '-'}
                </p>
                {vehicleData && (
                  <Link
                    href={`/cars/${vehicleData.id}`}
                    className="inline-flex items-center gap-1 text-sm text-mandarin hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Voir le véhicule
                  </Link>
                )}
              </div>
            </div>
          </Card>

          {/* Tracking Timeline */}
          <Card>
            <h2 className="font-bold text-white mb-6">Suivi de la commande</h2>
            <OrderTimeline tracking={trackingData} currentStatus={orderData.status} />
          </Card>

          {/* Shipping Details */}
          <Card>
            <h2 className="font-bold text-white mb-4">Détails de livraison</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-nobel mb-1">Destination</p>
                <p className="text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-mandarin" />
                  {orderData.destination_city || orderData.destination_port || '-'}
                  {orderData.destination_country && `, ${orderData.destination_country}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-nobel mb-1">Méthode</p>
                <p className="text-white capitalize">
                  {orderData.shipping_method === 'sea' ? 'Maritime' : 'Aérien'}
                  {orderData.container_type && ` (${orderData.container_type})`}
                </p>
              </div>
              {orderData.tracking_number && (
                <div>
                  <p className="text-xs text-nobel mb-1">Numéro de suivi</p>
                  <p className="text-white font-mono">{orderData.tracking_number}</p>
                </div>
              )}
              {orderData.estimated_arrival && (
                <div>
                  <p className="text-xs text-nobel mb-1">Arrivée estimée</p>
                  <p className="text-white flex items-center gap-2">
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
            <h2 className="font-bold text-white mb-4">Récapitulatif</h2>
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
                  <span className="text-white font-bold">Total</span>
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
            <h2 className="font-bold text-white mb-4">Actions</h2>
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
            <p className="text-sm text-nobel">
              Besoin d&apos;aide avec votre commande?
            </p>
            <p className="text-sm text-white mt-1">
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
      <span className="text-nobel">{label}</span>
      <span className="text-white">
        {value ? formatUsdToLocal(value) : '-'}
      </span>
    </div>
  );
}
