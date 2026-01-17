'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Check,
  MapPin,
  CreditCard,
  Search,
  FileText,
  Ship,
  Package,
  Lock,
  ClipboardCheck,
  ShoppingCart,
  Building,
  Truck,
  Anchor,
  FileCheck,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import type { OrderTracking } from '@/types/database';

interface OrderTimelineProps {
  tracking: OrderTracking[];
  currentStatus: string;
  className?: string;
}

// Main workflow steps matching 13-step ORDER_STATUSES
// Showing 8 main steps for compact display
const TIMELINE_STEPS = [
  { status: 'deposit_paid', icon: CreditCard, label: 'Acompte', step: 1 },
  { status: 'vehicle_locked', icon: Lock, label: 'Bloqué', step: 2 },
  { status: 'inspection_sent', icon: ClipboardCheck, label: 'Inspection', step: 3 },
  { status: 'full_payment_received', icon: CreditCard, label: 'Paiement', step: 4 },
  { status: 'vehicle_purchased', icon: ShoppingCart, label: 'Acheté', step: 5 },
  { status: 'shipping', icon: Ship, label: 'En mer', step: 9 },
  { status: 'documents_ready', icon: FileText, label: 'Documents', step: 10 },
  { status: 'delivered', icon: Home, label: 'Livré', step: 13 },
];

export function OrderTimeline({
  tracking,
  currentStatus,
  className,
}: OrderTimelineProps) {
  const currentStep = ORDER_STATUSES[currentStatus as OrderStatus]?.step || 0;
  const isCancelled = currentStatus === 'cancelled';
  const isPendingReassignment = currentStatus === 'pending_reassignment';

  // Find the index of current step in TIMELINE_STEPS
  const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.step >= currentStep);
  const progressIndex = currentStepIndex === -1 ? TIMELINE_STEPS.length : currentStepIndex;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Steps */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-surface">
          <div
            className={cn(
              'h-full transition-all duration-500',
              isCancelled ? 'bg-red-500' : isPendingReassignment ? 'bg-yellow-500' : 'bg-mandarin'
            )}
            style={{
              width: isCancelled || isPendingReassignment
                ? '0%'
                : `${Math.min(100, (progressIndex / (TIMELINE_STEPS.length - 1)) * 100)}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {TIMELINE_STEPS.map((step, index) => {
            const isCompleted = step.step < currentStep;
            const isCurrent = step.step === currentStep ||
              (currentStep > TIMELINE_STEPS[index]?.step && currentStep < (TIMELINE_STEPS[index + 1]?.step || 999));
            const Icon = step.icon;

            return (
              <div
                key={step.status}
                className="flex flex-col items-center"
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all z-10',
                    isCompleted && 'bg-jewel text-white',
                    isCurrent && !isCancelled && !isPendingReassignment && 'bg-mandarin text-white ring-4 ring-mandarin/20',
                    isCancelled && 'bg-red-500/20 text-red-500',
                    isPendingReassignment && index === 0 && 'bg-yellow-500 text-white ring-4 ring-yellow-500/20',
                    !isCompleted && !isCurrent && !isCancelled && 'bg-surface text-nobel'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-2 text-center max-w-[60px]',
                    (isCompleted || isCurrent) && !isCancelled && !isPendingReassignment ? 'text-[var(--text-primary)]' : 'text-nobel'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Tracking Events */}
      {tracking.length > 0 && (
        <div className="mt-8 space-y-4">
          <h4 className="text-sm font-medium text-nobel uppercase tracking-wider">
            Historique
          </h4>
          <div className="space-y-3">
            {tracking.map((event, index) => (
              <TrackingEvent
                key={event.id}
                event={event}
                isLatest={index === tracking.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TrackingEventProps {
  event: OrderTracking;
  isLatest: boolean;
}

function TrackingEvent({ event, isLatest }: TrackingEventProps) {
  const formattedDate = event.completed_at
    ? format(new Date(event.completed_at), "d MMM yyyy 'à' HH:mm", { locale: fr })
    : '-';

  return (
    <div
      className={cn(
        'relative pl-6 pb-4 border-l-2',
        isLatest ? 'border-mandarin' : 'border-nobel/30'
      )}
    >
      {/* Dot */}
      <div
        className={cn(
          'absolute -left-[5px] top-0 w-2 h-2 rounded-full',
          isLatest ? 'bg-mandarin' : 'bg-nobel'
        )}
      />

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h5 className={cn('font-medium', isLatest ? 'text-white' : 'text-nobel')}>
            {event.title}
          </h5>
          <span className="text-xs text-nobel">{formattedDate}</span>
        </div>
        {event.description && (
          <p className="text-sm text-nobel">{event.description}</p>
        )}
        {event.location && (
          <p className="text-xs text-nobel flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {event.location}
          </p>
        )}
      </div>
    </div>
  );
}

// Simple status display
interface OrderStatusDisplayProps {
  status: string;
  className?: string;
}

export function OrderStatusDisplay({ status, className }: OrderStatusDisplayProps) {
  const statusInfo = ORDER_STATUSES[status as OrderStatus] || ORDER_STATUSES.deposit_paid;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-2 h-2 rounded-full', statusInfo.color)} />
      <span className="text-sm text-white">{statusInfo.label}</span>
    </div>
  );
}
