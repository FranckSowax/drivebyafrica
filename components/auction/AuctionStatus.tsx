'use client';

import { Clock, CheckCircle, XCircle, Gavel } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { InlineCountdown } from './CountdownTimer';
import { cn } from '@/lib/utils';
import type { AuctionStatus as AuctionStatusType } from '@/types/vehicle';

interface AuctionStatusProps {
  status: AuctionStatusType | string;
  auctionDate?: string | null;
  className?: string;
  showCountdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  AuctionStatusType,
  {
    icon: typeof Clock;
    label: string;
    variant: 'default' | 'success' | 'warning' | 'error' | 'info';
    color: string;
  }
> = {
  upcoming: {
    icon: Clock,
    label: 'À venir',
    variant: 'info',
    color: 'text-royal-blue',
  },
  ongoing: {
    icon: Gavel,
    label: 'En cours',
    variant: 'warning',
    color: 'text-mandarin',
  },
  sold: {
    icon: CheckCircle,
    label: 'Vendu',
    variant: 'success',
    color: 'text-jewel',
  },
  ended: {
    icon: XCircle,
    label: 'Terminé',
    variant: 'default',
    color: 'text-nobel',
  },
};

export function AuctionStatus({
  status,
  auctionDate,
  className,
  showCountdown = true,
  size = 'md',
}: AuctionStatusProps) {
  const config = statusConfig[status as AuctionStatusType] || statusConfig.ended;
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

      {showCountdown && auctionDate && (status === 'upcoming' || status === 'ongoing') && (
        <div className="flex items-center gap-1 ml-2">
          <Clock className={cn(iconSizes[size], 'text-nobel')} />
          <InlineCountdown targetDate={auctionDate} />
        </div>
      )}
    </div>
  );
}

// Pill version for vehicle cards
interface AuctionStatusPillProps {
  status: AuctionStatusType | string;
  className?: string;
}

export function AuctionStatusPill({ status, className }: AuctionStatusPillProps) {
  const config = statusConfig[status as AuctionStatusType] || statusConfig.ended;

  const bgColors: Record<AuctionStatusType, string> = {
    upcoming: 'bg-royal-blue',
    ongoing: 'bg-mandarin',
    sold: 'bg-jewel',
    ended: 'bg-nobel',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium text-white',
        bgColors[status as AuctionStatusType] || bgColors.ended,
        status === 'ongoing' && 'animate-pulse',
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Live indicator for ongoing auctions
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
