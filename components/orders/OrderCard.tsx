'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Package, MapPin, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatUsdToLocal } from '@/lib/utils/currency';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/database';

interface OrderCardProps {
  order: Order;
  vehicleTitle?: string;
  vehicleImage?: string | null;
  showDetails?: boolean;
  className?: string;
}

export function OrderCard({
  order,
  vehicleTitle,
  vehicleImage,
  showDetails = true,
  className,
}: OrderCardProps) {
  const status = ORDER_STATUSES[order.status as OrderStatus] || ORDER_STATUSES.pending_payment;
  const createdAt = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <Link href={`/dashboard/orders/${order.id}`}>
      <Card className={cn('hover:border-mandarin/50 transition-all group', className)}>
        <div className="flex gap-4">
          {/* Vehicle Image */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
            {vehicleImage ? (
              <Image
                src={vehicleImage}
                alt={vehicleTitle || 'Vehicle'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="w-8 h-8 text-nobel" />
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-white truncate">
                  {vehicleTitle || `Commande #${order.id.slice(-6).toUpperCase()}`}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-nobel">
                  <Clock className="w-3 h-3" />
                  <span>{createdAt}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-nobel group-hover:text-mandarin transition-colors flex-shrink-0" />
            </div>

            {/* Status Badge */}
            <div className="mt-2">
              <Badge className={cn('text-xs', status.color)}>
                {status.label}
              </Badge>
            </div>

            {showDetails && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {/* Destination */}
                {order.destination_country && (
                  <div className="flex items-center gap-1 text-nobel">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {order.destination_port || order.destination_city || order.destination_country}
                    </span>
                  </div>
                )}

                {/* Total Price */}
                {order.total_price_usd && (
                  <div className="text-mandarin font-medium">
                    {formatUsdToLocal(order.total_price_usd)}
                  </div>
                )}
              </div>
            )}

            {/* Tracking Number */}
            {order.tracking_number && (
              <p className="mt-2 text-xs text-nobel">
                Tracking: <span className="text-white">{order.tracking_number}</span>
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Compact version for dashboard widgets
interface OrderCardCompactProps {
  order: Order;
  vehicleTitle?: string;
  className?: string;
}

export function OrderCardCompact({ order, vehicleTitle, className }: OrderCardCompactProps) {
  const status = ORDER_STATUSES[order.status as OrderStatus] || ORDER_STATUSES.pending_payment;

  return (
    <Link href={`/dashboard/orders/${order.id}`}>
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface/80 transition-colors',
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">
            {vehicleTitle || `#${order.id.slice(-6).toUpperCase()}`}
          </p>
          <p className="text-xs text-nobel">{status.label}</p>
        </div>
        {order.total_price_usd && (
          <span className="text-sm text-mandarin font-medium ml-2">
            {formatUsdToLocal(order.total_price_usd)}
          </span>
        )}
      </div>
    </Link>
  );
}
