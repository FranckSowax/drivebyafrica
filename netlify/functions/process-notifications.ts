import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Scheduled Function for processing notification queue
 * Schedule: Run every minute
 *
 * Uses Meta WhatsApp Cloud API for sending notifications.
 */
export const config = {
  schedule: '* * * * *', // Every minute
};

const MAX_BATCH_SIZE = 10;
const META_API_VERSION = 'v21.0';

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
 * Format phone number for Meta Cloud API (digits only)
 */
function formatPhoneForMeta(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, '');

  if (digits.startsWith('0')) {
    digits = '241' + digits.substring(1);
  }

  if (digits.length <= 9) {
    digits = '241' + digits;
  }

  return digits;
}

/**
 * Send message via Meta WhatsApp Cloud API
 */
async function sendMetaMessage(
  to: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return { success: false, error: 'Meta WhatsApp API not configured' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          ...payload,
        }),
      }
    );

    const result = await response.json();

    if (response.ok && result.messages?.[0]?.id) {
      return { success: true, messageId: result.messages[0].id };
    }

    return { success: false, error: result.error?.message || JSON.stringify(result) };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send WhatsApp notification via Meta Cloud API
 */
async function sendWhatsAppNotification(
  notification: QueuedNotification
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const payload = notification.payload;

  // Build message based on notification type
  let message = '';

  if (notification.notification_type === 'custom' && payload.customMessage) {
    message = payload.customMessage;
  } else {
    const customerName = notification.recipient_name || payload.customerName || 'Client';
    const vehicleName = payload.vehicleInfo
      ? `${payload.vehicleInfo.make} ${payload.vehicleInfo.model} ${payload.vehicleInfo.year || ''}`
      : 'Votre véhicule';
    const orderNumber = payload.orderNumber || payload.quoteNumber || '';
    const status = payload.status || 'processing';

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

  const formattedPhone = formatPhoneForMeta(notification.recipient_phone);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://driveby-africa.com';
  const dashboardUrl = notification.order_id
    ? `${siteUrl}/dashboard/orders/${notification.order_id}`
    : payload.dashboardUrl || `${siteUrl}/dashboard/orders`;

  // Try interactive CTA URL button first
  const interactiveResult = await sendMetaMessage(formattedPhone, {
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: message },
      footer: { text: 'Driveby Africa - Import véhicules' },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: 'Voir ma commande',
          url: dashboardUrl,
        },
      },
    },
  });

  if (interactiveResult.success) {
    return interactiveResult;
  }

  // Fallback to plain text
  console.log('Interactive button failed, falling back to text');
  return sendMetaMessage(formattedPhone, {
    type: 'text',
    text: { preview_url: true, body: `${message}\n\n👉 ${dashboardUrl}` },
  });
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

    for (let i = 0; i < MAX_BATCH_SIZE; i++) {
      if (Date.now() - startTime > 20000) {
        console.log('Time limit approaching, stopping batch');
        break;
      }

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
        break;
      }

      await supabase
        .from('notification_queue')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification.id)
        .eq('status', 'pending');

      results.processed++;

      const sendStartTime = Date.now();
      const result = await sendWhatsAppNotification(notification as QueuedNotification);
      const durationMs = Date.now() - sendStartTime;

      if (result.success) {
        results.succeeded++;

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

        const backoffMinutes = Math.min(Math.pow(2, notification.attempts || 0) * 1, 60);
        const nextRetry = maxReached
          ? null
          : new Date(Date.now() + backoffMinutes * 60000).toISOString();

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
