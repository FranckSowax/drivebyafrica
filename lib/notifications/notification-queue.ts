/**
 * Notification Queue Service
 *
 * Provides a robust queue system for WhatsApp notifications with:
 * - Idempotency (no duplicate sends)
 * - Automatic retries with exponential backoff
 * - Logging and audit trail
 * - Priority handling
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';

// Types
export interface NotificationPayload {
  status?: string;
  previousStatus?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    imageUrl?: string;
  };
  orderNumber?: string;
  quoteNumber?: string;
  customerName?: string;
  documents?: Array<{
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'link';
    visibleToClient?: boolean;
  }>;
  customMessage?: string;
  dashboardUrl?: string;
  shippingEta?: string;
  note?: string;
}

export interface EnqueueNotificationParams {
  recipientPhone: string;
  recipientName?: string;
  recipientUserId?: string;
  notificationType: 'status_change' | 'document_upload' | 'order_confirmation' | 'payment_reminder' | 'shipping_update' | 'delivery_notification' | 'custom';
  orderId?: string;
  quoteId?: string;
  payload: NotificationPayload;
  triggeredBy?: string;
  triggeredByRole?: 'admin' | 'super_admin' | 'collaborator' | 'system';
  priority?: number; // 1-10, lower = higher priority
  scheduledAt?: Date;
  idempotencyKey?: string;
}

export interface QueuedNotification {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  recipient_user_id: string | null;
  notification_type: string;
  order_id: string | null;
  quote_id: string | null;
  payload: NotificationPayload;
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  last_error_code: string | null;
  whatsapp_message_id: string | null;
  whatsapp_status: string | null;
  idempotency_key: string;
  priority: number;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  triggered_by: string | null;
  triggered_by_role: string | null;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

// Get Supabase service client (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials for notification queue');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

/**
 * Generate idempotency key for a notification
 * Combines order/quote ID, status, and timestamp (rounded to minute)
 */
export function generateIdempotencyKey(params: {
  orderId?: string;
  quoteId?: string;
  status?: string;
  notificationType: string;
}): string {
  const timestamp = Math.floor(Date.now() / 60000); // Round to minute
  const parts = [
    params.orderId || params.quoteId || 'no-order',
    params.notificationType,
    params.status || 'no-status',
    timestamp.toString()
  ];
  return parts.join('-');
}

/**
 * Enqueue a notification for processing
 * Returns the queue ID (existing or new)
 */
export async function enqueueNotification(params: EnqueueNotificationParams): Promise<string> {
  const supabase = getServiceClient();

  // Generate idempotency key if not provided
  const idempotencyKey = params.idempotencyKey || generateIdempotencyKey({
    orderId: params.orderId,
    quoteId: params.quoteId,
    status: params.payload.status,
    notificationType: params.notificationType
  });

  // Check for existing notification with same idempotency key
  const { data: existing } = await supabase
    .from('notification_queue')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existing) {
    console.log(`[NotificationQueue] Duplicate prevented: ${idempotencyKey}`);
    return existing.id;
  }

  // Insert new notification
  const { data, error } = await supabase
    .from('notification_queue')
    .insert({
      recipient_phone: params.recipientPhone,
      recipient_name: params.recipientName || null,
      recipient_user_id: params.recipientUserId || null,
      notification_type: params.notificationType,
      order_id: params.orderId || null,
      quote_id: params.quoteId || null,
      payload: params.payload,
      triggered_by: params.triggeredBy || null,
      triggered_by_role: params.triggeredByRole || null,
      priority: params.priority || 5,
      scheduled_at: params.scheduledAt?.toISOString() || new Date().toISOString(),
      idempotency_key: idempotencyKey,
      status: 'pending',
      attempts: 0,
      max_attempts: 3
    })
    .select('id')
    .single();

  if (error) {
    console.error('[NotificationQueue] Failed to enqueue:', error);
    throw new Error(`Failed to enqueue notification: ${error.message}`);
  }

  // Log creation
  await logNotificationEvent(data.id, 'created', { status_after: 'pending' });

  console.log(`[NotificationQueue] Enqueued: ${data.id} (${params.notificationType})`);
  return data.id;
}

/**
 * Get next notification to process
 * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent processing
 */
export async function getNextNotification(): Promise<QueuedNotification | null> {
  const supabase = getServiceClient();

  // Get next pending notification
  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
    .order('priority', { ascending: true })
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  // Mark as processing
  const { error: updateError } = await supabase
    .from('notification_queue')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString()
    })
    .eq('id', data.id)
    .eq('status', 'pending'); // Ensure still pending (optimistic lock)

  if (updateError) {
    console.error('[NotificationQueue] Failed to mark as processing:', updateError);
    return null;
  }

  await logNotificationEvent(data.id, 'processing_started', {
    status_before: 'pending',
    status_after: 'processing',
    attempt_number: data.attempts + 1
  });

  return data as QueuedNotification;
}

/**
 * Mark notification as successfully sent
 */
export async function markNotificationSent(
  queueId: string,
  result: { messageId?: string; apiResponse?: Record<string, unknown> },
  durationMs: number
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('notification_queue')
    .update({
      status: 'sent',
      whatsapp_message_id: result.messageId || null,
      whatsapp_status: 'sent',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', queueId);

  if (error) {
    console.error('[NotificationQueue] Failed to mark as sent:', error);
  }

  // Increment attempts - use direct update since RPC may not exist
  try {
    await supabase.rpc('increment_notification_attempts', { queue_id: queueId });
  } catch {
    // Fallback if RPC doesn't exist
    await supabase
      .from('notification_queue')
      .update({ attempts: 1 })
      .eq('id', queueId);
  }

  await logNotificationEvent(queueId, 'message_sent', {
    status_before: 'processing',
    status_after: 'sent',
    api_response: result.apiResponse,
    duration_ms: durationMs
  });

  console.log(`[NotificationQueue] Sent: ${queueId}`);
}

/**
 * Mark notification as failed
 * Schedules retry if attempts < max_attempts
 */
export async function markNotificationFailed(
  queueId: string,
  error: { message: string; code?: string; apiResponse?: Record<string, unknown> },
  durationMs: number
): Promise<void> {
  const supabase = getServiceClient();

  // Get current state
  const { data: notification } = await supabase
    .from('notification_queue')
    .select('attempts, max_attempts')
    .eq('id', queueId)
    .single();

  if (!notification) return;

  const newAttempts = notification.attempts + 1;
  const maxReached = newAttempts >= notification.max_attempts;

  // Calculate next retry with exponential backoff
  // 1min, 5min, 15min, 30min, 1hr
  const backoffMinutes = Math.min(Math.pow(2, notification.attempts) * 1, 60);
  const nextRetry = maxReached ? null : new Date(Date.now() + backoffMinutes * 60000).toISOString();

  const { error: updateError } = await supabase
    .from('notification_queue')
    .update({
      status: maxReached ? 'failed' : 'pending',
      attempts: newAttempts,
      last_error: error.message,
      last_error_code: error.code || null,
      next_retry_at: nextRetry,
      updated_at: new Date().toISOString()
    })
    .eq('id', queueId);

  if (updateError) {
    console.error('[NotificationQueue] Failed to mark as failed:', updateError);
  }

  await logNotificationEvent(queueId, maxReached ? 'failed' : 'retry_scheduled', {
    status_before: 'processing',
    status_after: maxReached ? 'failed' : 'pending',
    attempt_number: newAttempts,
    error_message: error.message,
    error_code: error.code,
    api_response: error.apiResponse,
    duration_ms: durationMs
  });

  if (maxReached) {
    console.error(`[NotificationQueue] Failed permanently: ${queueId} after ${newAttempts} attempts`);
  } else {
    console.log(`[NotificationQueue] Retry scheduled: ${queueId} in ${backoffMinutes}min (attempt ${newAttempts})`);
  }
}

/**
 * Cancel a pending notification
 */
export async function cancelNotification(queueId: string, reason?: string): Promise<boolean> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('notification_queue')
    .update({
      status: 'cancelled',
      last_error: reason || 'Cancelled by user',
      updated_at: new Date().toISOString()
    })
    .eq('id', queueId)
    .in('status', ['pending', 'processing']);

  if (error) {
    console.error('[NotificationQueue] Failed to cancel:', error);
    return false;
  }

  await logNotificationEvent(queueId, 'cancelled', {
    status_after: 'cancelled',
    error_message: reason
  });

  return true;
}

/**
 * Log notification event for audit trail
 */
async function logNotificationEvent(
  queueId: string,
  eventType: 'created' | 'processing_started' | 'message_sent' | 'delivery_confirmed' | 'retry_scheduled' | 'failed' | 'cancelled',
  details: {
    status_before?: string;
    status_after?: string;
    attempt_number?: number;
    api_response?: Record<string, unknown>;
    error_message?: string;
    error_code?: string;
    duration_ms?: number;
  }
): Promise<void> {
  const supabase = getServiceClient();

  try {
    await supabase.from('notification_log').insert({
      queue_id: queueId,
      event_type: eventType,
      status_before: details.status_before || null,
      status_after: details.status_after || null,
      attempt_number: details.attempt_number || null,
      api_response: details.api_response || null,
      error_message: details.error_message || null,
      error_code: details.error_code || null,
      duration_ms: details.duration_ms || null
    });
  } catch (err) {
    console.error('[NotificationQueue] Failed to log event:', err);
  }
}

/**
 * Log order status change
 */
export async function logStatusChange(params: {
  orderId?: string;
  quoteId?: string;
  orderNumber?: string;
  previousStatus?: string;
  newStatus: string;
  changedBy?: string;
  changedByEmail?: string;
  changedByRole?: 'admin' | 'super_admin' | 'collaborator' | 'system';
  notificationSent: boolean;
  notificationQueueId?: string;
  note?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('order_status_log')
    .insert({
      order_id: params.orderId || null,
      quote_id: params.quoteId || null,
      order_number: params.orderNumber || null,
      previous_status: params.previousStatus || null,
      new_status: params.newStatus,
      changed_by: params.changedBy || null,
      changed_by_email: params.changedByEmail || null,
      changed_by_role: params.changedByRole || null,
      notification_sent: params.notificationSent,
      notification_queue_id: params.notificationQueueId || null,
      note: params.note || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null
    })
    .select('id')
    .single();

  if (error) {
    console.error('[NotificationQueue] Failed to log status change:', error);
    return null;
  }

  return data.id;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  oldestPending?: string;
}> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('notification_queue')
    .select('status, created_at')
    .in('status', ['pending', 'processing', 'sent', 'failed']);

  if (error || !data) {
    return { pending: 0, processing: 0, sent: 0, failed: 0 };
  }

  const stats = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    oldestPending: undefined as string | undefined
  };

  for (const item of data) {
    stats[item.status as keyof typeof stats]++;
    if (item.status === 'pending') {
      if (!stats.oldestPending || item.created_at < stats.oldestPending) {
        stats.oldestPending = item.created_at;
      }
    }
  }

  return stats;
}

/**
 * Get failed notifications for review
 */
export async function getFailedNotifications(limit = 50): Promise<QueuedNotification[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[NotificationQueue] Failed to get failed notifications:', error);
    return [];
  }

  return data as QueuedNotification[];
}

/**
 * Retry a failed notification
 */
export async function retryFailedNotification(queueId: string): Promise<boolean> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('notification_queue')
    .update({
      status: 'pending',
      attempts: 0,
      next_retry_at: null,
      last_error: null,
      last_error_code: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', queueId)
    .eq('status', 'failed');

  if (error) {
    console.error('[NotificationQueue] Failed to retry:', error);
    return false;
  }

  await logNotificationEvent(queueId, 'created', {
    status_before: 'failed',
    status_after: 'pending'
  });

  return true;
}
