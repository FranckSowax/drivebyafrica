import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Scheduled Function for processing notification queue
 * Schedule: Run every minute
 *
 * This function processes pending WhatsApp notifications from the queue,
 * with automatic retries and exponential backoff for failed notifications.
 */
export const config = {
  schedule: '* * * * *', // Every minute
};

const MAX_BATCH_SIZE = 10;
const NOTIFICATION_TIMEOUT = 25000; // 25 seconds (Netlify function timeout is 26s for scheduled)

interface NotificationPayload {
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

interface QueuedNotification {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  notification_type: string;
  order_id: string | null;
  quote_id: string | null;
  payload: NotificationPayload;
  attempts: number;
  max_attempts: number;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Format phone number for Whapi
 */
function formatPhoneForWhapi(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Add Gabon country code if no country code
  if (cleaned.length <= 9) {
    cleaned = '241' + cleaned;
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Send WhatsApp notification via Whapi
 */
async function sendWhatsAppNotification(
  notification: QueuedNotification
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const whapiToken = process.env.WHAPI_TOKEN;

  if (!whapiToken) {
    return { success: false, error: 'WHAPI_TOKEN not configured' };
  }

  const payload = notification.payload;

  // Build message based on notification type
  let message = '';

  if (notification.notification_type === 'custom' && payload.customMessage) {
    message = payload.customMessage;
  } else {
    // Build status change message
    const customerName = notification.recipient_name || payload.customerName || 'Client';
    const vehicleName = payload.vehicleInfo
      ? `${payload.vehicleInfo.make} ${payload.vehicleInfo.model} ${payload.vehicleInfo.year || ''}`
      : 'Votre véhicule';
    const orderNumber = payload.orderNumber || payload.quoteNumber || '';
    const status = payload.status || 'processing';

    // Status labels in French
    const statusLabels: Record<string, string> = {
      deposit_paid: 'Acompte payé',
      vehicle_locked: 'Véhicule bloqué',
      inspection_sent: 'Inspection envoyée',
      full_payment_received: 'Paiement complet reçu',
      vehicle_purchased: 'Véhicule acheté',
      export_customs: 'Douane export',
      in_transit: 'En transit',
      at_port: 'Au port',
      shipping: 'En mer',
      documents_ready: 'Documents prêts',
      customs: 'En douane',
      ready_pickup: 'Prêt pour retrait',
      delivered: 'Livré',
      processing: 'En traitement',
    };

    const statusLabel = statusLabels[status] || status;

    message = `🚗 *DRIVEBY AFRICA*\n\n`;
    message += `Bonjour ${customerName},\n\n`;
    message += `Mise à jour de votre commande${orderNumber ? ` ${orderNumber}` : ''}:\n\n`;
    message += `📦 *Véhicule:* ${vehicleName.trim()}\n`;
    message += `📍 *Statut:* ${statusLabel}\n`;

    if (payload.shippingEta) {
      message += `🗓️ *ETA:* ${payload.shippingEta}\n`;
    }

    if (payload.note) {
      message += `\n📝 *Note:* ${payload.note}\n`;
    }

  }

  const formattedPhone = formatPhoneForWhapi(notification.recipient_phone);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://driveby-africa.com';
  const dashboardUrl = notification.order_id
    ? `${siteUrl}/dashboard/orders/${notification.order_id}`
    : payload.dashboardUrl || `${siteUrl}/dashboard/orders`;

  try {
    // Try interactive button format first
    const interactiveResponse = await fetch('https://gate.whapi.cloud/messages/interactive', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whapiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        type: 'button',
        body: { text: message },
        footer: { text: 'Driveby Africa - Import vehicules' },
        action: {
          buttons: [
            {
              type: 'url',
              title: 'Voir ma commande',
              id: 'view_order',
              url: dashboardUrl,
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT),
    });

    if (interactiveResponse.ok) {
      const data = await interactiveResponse.json();
      if (data.sent) {
        return { success: true, messageId: data.message?.id };
      }
    }

    // Fallback to plain text if interactive fails
    console.log('Interactive button failed, falling back to text');
    const textResponse = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whapiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        body: `${message}\n\n👉 ${dashboardUrl}`,
      }),
      signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT),
    });

    if (!textResponse.ok) {
      const errorData = await textResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${textResponse.status}`,
      };
    }

    const data = await textResponse.json();
    return {
      success: true,
      messageId: data.message?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage.includes('abort') ? 'Request timeout' : errorMessage,
    };
  }
}

export default async function handler() {
  const startTime = Date.now();
  console.log('=== Notification Queue Processing Started ===');

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const supabase = getSupabaseAdmin();

    // Process up to MAX_BATCH_SIZE notifications
    for (let i = 0; i < MAX_BATCH_SIZE; i++) {
      // Check if we're running out of time (leave 5s buffer)
      if (Date.now() - startTime > 20000) {
        console.log('Time limit approaching, stopping batch');
        break;
      }

      // Get next pending notification
      const { data: notification, error: fetchError } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
        .order('priority', { ascending: true })
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single();

      if (fetchError || !notification) {
        // No more pending notifications
        break;
      }

      // Mark as processing
      await supabase
        .from('notification_queue')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification.id)
        .eq('status', 'pending');

      results.processed++;

      // Process the notification
      const sendStartTime = Date.now();
      const result = await sendWhatsAppNotification(notification as QueuedNotification);
      const durationMs = Date.now() - sendStartTime;

      if (result.success) {
        results.succeeded++;

        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            whatsapp_message_id: result.messageId || null,
            whatsapp_status: 'sent',
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        // Log success
        await supabase.from('notification_log').insert({
          queue_id: notification.id,
          event_type: 'message_sent',
          status_before: 'processing',
          status_after: 'sent',
          duration_ms: durationMs,
        });

        console.log(`[OK] Sent notification ${notification.id}`);
      } else {
        results.failed++;
        results.errors.push(`${notification.id}: ${result.error}`);

        const newAttempts = (notification.attempts || 0) + 1;
        const maxReached = newAttempts >= (notification.max_attempts || 3);

        // Calculate next retry with exponential backoff (1min, 5min, 15min)
        const backoffMinutes = Math.min(Math.pow(2, notification.attempts || 0) * 1, 60);
        const nextRetry = maxReached
          ? null
          : new Date(Date.now() + backoffMinutes * 60000).toISOString();

        // Mark as failed or schedule retry
        await supabase
          .from('notification_queue')
          .update({
            status: maxReached ? 'failed' : 'pending',
            attempts: newAttempts,
            last_error: result.error,
            last_error_code: result.error?.includes('timeout') ? 'TIMEOUT' : 'SEND_ERROR',
            next_retry_at: nextRetry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        // Log failure
        await supabase.from('notification_log').insert({
          queue_id: notification.id,
          event_type: maxReached ? 'failed' : 'retry_scheduled',
          status_before: 'processing',
          status_after: maxReached ? 'failed' : 'pending',
          attempt_number: newAttempts,
          error_message: result.error,
          duration_ms: durationMs,
        });

        if (maxReached) {
          console.log(`[FAIL] Notification ${notification.id} failed permanently after ${newAttempts} attempts`);
        } else {
          console.log(`[RETRY] Notification ${notification.id} will retry in ${backoffMinutes}min`);
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log('=== Summary ===');
    console.log(`Processed: ${results.processed}`);
    console.log(`Succeeded: ${results.succeeded}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        results,
        duration: `${(duration / 1000).toFixed(1)}s`,
      }),
    };
  } catch (error) {
    console.error('Notification processing failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Processing failed',
        results,
      }),
    };
  }
}
