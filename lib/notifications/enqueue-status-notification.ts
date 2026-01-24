/**
 * Helper to enqueue status change notifications
 *
 * This replaces direct WhatsApp sends with queue-based notifications
 * for reliability and retry capability.
 */

import {
  enqueueNotification,
  logStatusChange,
  type NotificationPayload
} from './notification-queue';

export interface StatusChangeNotificationParams {
  // Target
  recipientPhone: string;
  recipientName?: string;
  recipientUserId?: string;

  // Order context
  orderId?: string;
  quoteId?: string;
  orderNumber?: string;

  // Status change
  previousStatus?: string;
  newStatus: string;

  // Vehicle info
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    imageUrl?: string;
  };

  // Documents
  documents?: Array<{
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'link';
    visibleToClient?: boolean;
  }>;

  // Additional
  note?: string;
  eta?: string;
  dashboardUrl?: string;

  // Who triggered this
  triggeredBy?: string;
  triggeredByEmail?: string;
  triggeredByRole?: 'admin' | 'super_admin' | 'collaborator' | 'system';

  // Request context for logging
  ipAddress?: string;
  userAgent?: string;
}

export interface EnqueueResult {
  success: boolean;
  queueId?: string;
  statusLogId?: string;
  error?: string;
}

/**
 * Enqueue a status change notification and log the status change
 * This is the main function to use when changing order status
 */
export async function enqueueStatusNotification(
  params: StatusChangeNotificationParams
): Promise<EnqueueResult> {
  try {
    // Prepare notification payload
    const payload: NotificationPayload = {
      status: params.newStatus,
      previousStatus: params.previousStatus,
      vehicleInfo: params.vehicleInfo,
      orderNumber: params.orderNumber,
      customerName: params.recipientName,
      documents: params.documents?.filter(d => d.visibleToClient !== false),
      note: params.note,
      dashboardUrl: params.dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders`,
      shippingEta: params.eta
    };

    // Enqueue the notification
    const queueId = await enqueueNotification({
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      recipientUserId: params.recipientUserId,
      notificationType: 'status_change',
      orderId: params.orderId,
      quoteId: params.quoteId,
      payload,
      triggeredBy: params.triggeredBy,
      triggeredByRole: params.triggeredByRole,
      priority: getStatusPriority(params.newStatus)
    });

    // Log the status change
    const statusLogId = await logStatusChange({
      orderId: params.orderId,
      quoteId: params.quoteId,
      orderNumber: params.orderNumber,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      changedBy: params.triggeredBy,
      changedByEmail: params.triggeredByEmail,
      changedByRole: params.triggeredByRole,
      notificationSent: true, // Queued = will be sent
      notificationQueueId: queueId,
      note: params.note,
      metadata: {
        vehicleInfo: params.vehicleInfo,
        eta: params.eta,
        documentsCount: params.documents?.length || 0
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    console.log(`[StatusNotification] Enqueued: ${queueId} for order ${params.orderNumber || params.orderId}`);

    return {
      success: true,
      queueId,
      statusLogId: statusLogId || undefined
    };
  } catch (error) {
    console.error('[StatusNotification] Failed to enqueue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enqueue notification'
    };
  }
}

/**
 * Get priority based on status importance
 * Lower number = higher priority
 */
function getStatusPriority(status: string): number {
  const highPriorityStatuses = [
    'deposit_paid',      // Customer just paid - important to confirm
    'delivered',         // Final delivery - customer is waiting
    'ready_pickup'       // Customer needs to pick up
  ];

  const mediumPriorityStatuses = [
    'vehicle_purchased', // Good news for customer
    'documents_ready',   // Customer needs to review docs
    'customs'            // Customs updates are time-sensitive
  ];

  if (highPriorityStatuses.includes(status)) {
    return 2;
  }
  if (mediumPriorityStatuses.includes(status)) {
    return 4;
  }
  return 5; // Default priority
}

/**
 * Enqueue document upload notification
 */
export async function enqueueDocumentNotification(params: {
  recipientPhone: string;
  recipientName?: string;
  recipientUserId?: string;
  orderId?: string;
  quoteId?: string;
  orderNumber?: string;
  status: string;
  documents: Array<{
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'link';
    visibleToClient?: boolean;
  }>;
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
  };
  triggeredBy?: string;
  triggeredByRole?: 'admin' | 'collaborator' | 'system';
}): Promise<EnqueueResult> {
  try {
    const payload: NotificationPayload = {
      status: params.status,
      orderNumber: params.orderNumber,
      customerName: params.recipientName,
      vehicleInfo: params.vehicleInfo,
      documents: params.documents.filter(d => d.visibleToClient !== false)
    };

    const queueId = await enqueueNotification({
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      recipientUserId: params.recipientUserId,
      notificationType: 'document_upload',
      orderId: params.orderId,
      quoteId: params.quoteId,
      payload,
      triggeredBy: params.triggeredBy,
      triggeredByRole: params.triggeredByRole,
      priority: 4 // Medium priority for documents
    });

    return { success: true, queueId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enqueue'
    };
  }
}

/**
 * Send custom WhatsApp message (enqueued)
 */
export async function enqueueCustomNotification(params: {
  recipientPhone: string;
  recipientName?: string;
  recipientUserId?: string;
  orderId?: string;
  message: string;
  triggeredBy?: string;
  triggeredByRole?: 'admin' | 'collaborator' | 'system';
}): Promise<EnqueueResult> {
  try {
    const queueId = await enqueueNotification({
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      recipientUserId: params.recipientUserId,
      notificationType: 'custom',
      orderId: params.orderId,
      payload: {
        customMessage: params.message
      },
      triggeredBy: params.triggeredBy,
      triggeredByRole: params.triggeredByRole,
      priority: 5
    });

    return { success: true, queueId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enqueue'
    };
  }
}
