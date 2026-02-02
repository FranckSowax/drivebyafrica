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
  Home,
  Download,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import type { OrderTracking } from '@/types/database';
import type { Json } from '@/types/database';

interface UploadedDocument {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
  // Status document fields
  requirement_id?: string;
  status?: string;
  visible_to_client?: boolean;
}

interface OrderTimelineProps {
  tracking: OrderTracking[];
  currentStatus: string;
  className?: string;
  documents?: Json;
}

// Main workflow steps matching 14-step ORDER_STATUSES
// Showing 8 main steps for compact display (vehicle_received excluded - admin only)
const TIMELINE_STEPS = [
  { status: 'deposit_paid', icon: CreditCard, label: 'Acompte', step: 1 },
  { status: 'vehicle_locked', icon: Lock, label: 'Bloqué', step: 2 },
  { status: 'inspection_sent', icon: ClipboardCheck, label: 'Inspection', step: 3 },
  { status: 'full_payment_received', icon: CreditCard, label: 'Paiement', step: 4 },
  { status: 'vehicle_purchased', icon: ShoppingCart, label: 'Acheté', step: 5 },
  { status: 'shipping', icon: Ship, label: 'En mer', step: 10 },
  { status: 'documents_ready', icon: FileText, label: 'Documents', step: 11 },
  { status: 'delivered', icon: Home, label: 'Livré', step: 14 },
];

// Statuses hidden from customer view
const ADMIN_ONLY_STATUSES = ['vehicle_received'];

export function OrderTimeline({
  tracking,
  currentStatus,
  className,
  documents,
}: OrderTimelineProps) {
  const currentStep = ORDER_STATUSES[currentStatus as OrderStatus]?.step || 0;

  // Parse documents and filter only client-visible ones
  const allDocs: UploadedDocument[] = Array.isArray(documents)
    ? (documents as unknown as UploadedDocument[])
    : [];
  // Only show documents that are visible to client (or legacy docs without the field)
  const docList = allDocs.filter(doc => doc.visible_to_client !== false);
  const isCancelled = currentStatus === 'cancelled';
  const isPendingReassignment = currentStatus === 'pending_reassignment';

  // Find the index of the completed step in TIMELINE_STEPS
  // When step is 1 (deposit_paid), progress bar goes to index 0 (Acompte completed)
  const completedStepIndex = TIMELINE_STEPS.findIndex(s => s.step > currentStep);
  const progressIndex = completedStepIndex === -1 ? TIMELINE_STEPS.length : completedStepIndex;

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
            // Step is completed if it's at or below current step
            // This means when deposit_paid (step 1), "Acompte" is green (completed)
            const isCompleted = step.step <= currentStep;
            // Step is "current" (orange) if it's the next step after current
            // This means when deposit_paid (step 1), "Bloqué" (step 2) is orange
            const nextStepValue = TIMELINE_STEPS[index]?.step || 999;
            const isNextStep = step.step > currentStep &&
              (index === 0 || TIMELINE_STEPS[index - 1]?.step <= currentStep);
            const isCurrent = isNextStep ||
              (currentStep > 0 && currentStep > TIMELINE_STEPS[index - 1]?.step && currentStep < nextStepValue);
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
      {tracking.filter(e => !ADMIN_ONLY_STATUSES.includes(e.status)).length > 0 && (
        <div className="mt-8 space-y-4">
          <h4 className="text-sm font-medium text-nobel uppercase tracking-wider">
            Historique
          </h4>
          <div className="space-y-3">
            {(() => {
              const visibleTracking = tracking.filter(event => !ADMIN_ONLY_STATUSES.includes(event.status));
              return visibleTracking.map((event, index) => {
                // Find documents uploaded around this event's time (within 24h before or after)
                const eventDate = new Date(event.completed_at);
                const relatedDocs = docList.filter(doc => {
                  const docDate = new Date(doc.uploaded_at);
                  const timeDiff = Math.abs(docDate.getTime() - eventDate.getTime());
                  const hoursDiff = timeDiff / (1000 * 60 * 60);
                  return hoursDiff <= 24;
                });

                return (
                  <TrackingEvent
                    key={event.id}
                    event={event}
                    isLatest={index === visibleTracking.length - 1}
                    documents={relatedDocs}
                  />
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Documents uploaded but not associated with specific events */}
      {docList.length > 0 && tracking.length === 0 && (
        <div className="mt-8 space-y-4">
          <h4 className="text-sm font-medium text-nobel uppercase tracking-wider">
            Documents disponibles
          </h4>
          <div className="space-y-2">
            {docList.map((doc, index) => (
              <DocumentLink key={index} document={doc} />
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
  documents?: UploadedDocument[];
}

function TrackingEvent({ event, isLatest, documents = [] }: TrackingEventProps) {
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
        {/* Documents linked to this event */}
        {documents.length > 0 && (
          <div className="mt-2 space-y-1">
            {documents.map((doc, index) => (
              <DocumentLink key={index} document={doc} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Document link component
function DocumentLink({
  document,
  compact = false,
}: {
  document: UploadedDocument;
  compact?: boolean;
}) {
  return (
    <a
      href={document.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 text-sm text-mandarin hover:text-mandarin/80 transition-colors',
        compact ? 'py-0.5' : 'py-1'
      )}
    >
      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{document.name}</span>
      <Download className="w-3 h-3 flex-shrink-0 opacity-60" />
    </a>
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
