'use client';

import { cn } from '@/lib/utils';
import { useCollaboratorLocale } from './CollaboratorLocaleProvider';
import {
  Car,
  MapPin,
  Calendar,
  FileText,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    total_price_usd: number;
    deposit_amount_usd?: number;
    shipping_country?: string;
    shipping_city?: string;
    eta?: string;
    vehicle?: {
      make?: string;
      model?: string;
      year?: number;
      source?: string;
      image_url?: string;
    };
    user?: {
      full_name?: string;
      phone?: string;
    };
    tracking?: {
      status: string;
    }[];
    documents?: unknown[];
  };
  onViewDetails: () => void;
  onContactWhatsApp?: () => void;
}

const statusColors: Record<string, string> = {
  deposit_paid: 'bg-blue-500',
  vehicle_locked: 'bg-purple-500',
  inspection_sent: 'bg-indigo-500',
  full_payment_received: 'bg-cyan-500',
  vehicle_purchased: 'bg-teal-500',
  export_customs: 'bg-yellow-500',
  in_transit: 'bg-orange-500',
  at_port: 'bg-amber-500',
  shipping: 'bg-sky-500',
  documents_ready: 'bg-emerald-500',
  customs: 'bg-lime-500',
  ready_pickup: 'bg-green-500',
  delivered: 'bg-jewel',
};

const statusOrder = [
  'deposit_paid',
  'vehicle_locked',
  'inspection_sent',
  'full_payment_received',
  'vehicle_purchased',
  'export_customs',
  'in_transit',
  'at_port',
  'shipping',
  'documents_ready',
  'customs',
  'ready_pickup',
  'delivered',
];

export function CollaboratorOrderCard({ order, onViewDetails, onContactWhatsApp }: OrderCardProps) {
  const { t } = useCollaboratorLocale();

  const statusIndex = statusOrder.indexOf(order.status);
  const progress = statusIndex >= 0 ? ((statusIndex + 1) / statusOrder.length) * 100 : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-nobel/10 rounded-xl border border-nobel/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-nobel/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            #{order.order_number}
          </span>
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-full text-white',
              statusColors[order.status] || 'bg-gray-500'
            )}
          >
            {t(`statuses.${order.status}`)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-nobel/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-mandarin transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {t('orders.progress')}: {Math.round(progress)}%
        </p>
      </div>

      {/* Vehicle info */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Vehicle image */}
          <div className="w-20 h-20 flex-shrink-0 bg-nobel/20 rounded-lg overflow-hidden">
            {order.vehicle?.image_url ? (
              <img
                src={order.vehicle.image_url}
                alt={`${order.vehicle?.make} ${order.vehicle?.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="h-8 w-8 text-gray-600" />
              </div>
            )}
          </div>

          {/* Vehicle details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}
            </h3>
            <p className="text-sm text-gray-400 mb-2">
              {order.vehicle?.source && (
                <span className="inline-flex items-center gap-1">
                  {order.vehicle.source === 'korea' && '🇰🇷'}
                  {order.vehicle.source === 'china' && '🇨🇳'}
                  {order.vehicle.source === 'dubai' && '🇦🇪'}
                  {order.vehicle.source === 'dongchedi' && '🇨🇳'}
                  {order.vehicle.source === 'che168' && '🇨🇳'}
                  {order.vehicle.source === 'encar' && '🇰🇷'}
                  <span className="capitalize">{order.vehicle.source}</span>
                </span>
              )}
            </p>
            <p className="text-mandarin font-semibold">
              {formatPrice(order.total_price_usd)}
            </p>
          </div>
        </div>

        {/* Customer & destination */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="truncate">
              {order.user?.full_name} • {order.shipping_city}, {order.shipping_country}
            </span>
          </div>

          {order.eta && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>
                {t('orders.eta')}: {formatDate(order.eta)}
              </span>
            </div>
          )}

          {order.documents && order.documents.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText className="h-4 w-4 text-gray-500" />
              <span>
                {order.documents.length} {t('orders.documents').toLowerCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        {order.user?.phone && onContactWhatsApp && (
          <button
            onClick={onContactWhatsApp}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
              'text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30',
              'transition-colors'
            )}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        )}
        <button
          onClick={onViewDetails}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'text-sm font-medium bg-mandarin text-white hover:bg-mandarin/90',
            'transition-colors'
          )}
        >
          <span>{t('orders.viewDetails')}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
