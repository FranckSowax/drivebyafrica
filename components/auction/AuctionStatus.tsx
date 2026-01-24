'use client';

import { CheckCircle, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { VehicleStatus } from '@/types/vehicle';

interface VehicleStatusProps {
  status: VehicleStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  VehicleStatus,
  {
    icon: typeof Clock;
    label: string;
    variant: 'default' | 'success' | 'warning' | 'error' | 'info';
    color: string;
  }
> = {
  available: {
    icon: CheckCircle,
    label: 'Disponible',
    variant: 'success',
    color: 'text-jewel',
  },
  reserved: {
    icon: ShieldCheck,
    label: 'Réservé',
    variant: 'warning',
    color: 'text-mandarin',
  },
  sold: {
    icon: XCircle,
    label: 'Vendu',
    variant: 'error',
    color: 'text-red-500',
  },
  pending: {
    icon: Clock,
    label: 'En attente',
    variant: 'info',
    color: 'text-royal-blue',
  },
};

export function VehicleStatusBadge({
  status,
  className,
  size = 'md',
}: VehicleStatusProps) {
  const config = statusConfig[status as VehicleStatus] || statusConfig.available;
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn('flex items-center', sizeStyles[size], className)}>
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={iconSizes[size]} />
        <span>{config.label}</span>
      </Badge>
    </div>
  );
}

// Pill version for vehicle cards
interface VehicleStatusPillProps {
  status: VehicleStatus | string;
  className?: string;
}

export function VehicleStatusPill({ status, className }: VehicleStatusPillProps) {
  const config = statusConfig[status as VehicleStatus] || statusConfig.available;

  const bgColors: Record<VehicleStatus, string> = {
    available: 'bg-jewel',
    reserved: 'bg-mandarin',
    sold: 'bg-red-500',
    pending: 'bg-royal-blue',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium text-white',
        bgColors[status as VehicleStatus] || bgColors.available,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Legacy exports for backwards compatibility
export const AuctionStatus = VehicleStatusBadge;
export const AuctionStatusPill = VehicleStatusPill;

// Live indicator (kept for potential future use)
interface LiveIndicatorProps {
  className?: string;
}

export function LiveIndicator({ className }: LiveIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <span className="text-xs font-medium text-red-500 uppercase">Live</span>
    </div>
  );
}
