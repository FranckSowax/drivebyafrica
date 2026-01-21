/**
 * Notification Queue Worker API
 *
 * This endpoint processes pending notifications from the queue.
 * It should be called periodically (e.g., every 30 seconds via cron or Vercel cron).
 *
 * Security: Protected by API key or can be triggered internally
 *
 * Usage:
 * - POST /api/notifications/process
 * - Headers: { "x-api-key": "your-secret-key" } (for external cron)
 *
 * For Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/notifications/process",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import {
  getNextNotification,
  markNotificationSent,
  markNotificationFailed,
  getQueueStats,
  type QueuedNotification
} from '@/lib/notifications/notification-queue';
import { sendStatusChangeNotification } from '@/lib/whatsapp/send-status-notification';

// Maximum notifications to process per invocation
const MAX_BATCH_SIZE = 10;

// Timeout for each notification (ms)
const NOTIFICATION_TIMEOUT = 30000;

// Verify API key for external access
function verifyApiKey(request: Request): boolean {
  // Allow internal calls (from Vercel cron)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (isVercelCron) return true;

  // Check API key for external calls
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.NOTIFICATION_WORKER_API_KEY;

  if (!expectedKey) {
    console.warn('[NotificationWorker] NOTIFICATION_WORKER_API_KEY not set');
    return false;
  }

  return apiKey === expectedKey;
}

/**
 * Process a single notification
 */
async function processNotification(notification: QueuedNotification): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  durationMs: number;
}> {
  const startTime = Date.now();

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT);

    try {
      // Determine notification handler based on type
      let result: { success: boolean; messageId?: string; error?: string };

      switch (notification.notification_type) {
        case 'status_change':
          result = await processStatusChangeNotification(notification);
          break;

        case 'document_upload':
          result = await processDocumentNotification(notification);
          break;

        case 'order_confirmation':
        case 'payment_reminder':
        case 'shipping_update':
        case 'delivery_notification':
          result = await processStatusChangeNotification(notification);
          break;

        case 'custom':
          result = await processCustomNotification(notification);
          break;

        default:
          result = { success: false, error: `Unknown notification type: ${notification.notification_type}` };
      }

      clearTimeout(timeoutId);

      return {
        ...result,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('abort');

    return {
      success: false,
      error: isTimeout ? 'Request timeout' : errorMessage,
      errorCode: isTimeout ? 'TIMEOUT' : 'PROCESSING_ERROR',
      durationMs: Date.now() - startTime
    };
  }
}

/**
 * Process status change notification
 */
async function processStatusChangeNotification(notification: QueuedNotification): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const payload = notification.payload;

  if (!payload.status) {
    return { success: false, error: 'Missing status in payload' };
  }

  // Prepare documents for WhatsApp
  const documents = (payload.documents || [])
    .filter(doc => doc.visibleToClient !== false)
    .map(doc => ({
      name: doc.name,
      url: doc.url,
      type: doc.type
    }));

  try {
    // Build vehicle name from vehicle info
    const vehicleName = payload.vehicleInfo
      ? `${payload.vehicleInfo.make} ${payload.vehicleInfo.model} ${payload.vehicleInfo.year || ''}`
      : 'Votre véhicule';

    // Call existing WhatsApp notification function
    const result = await sendStatusChangeNotification({
      phone: notification.recipient_phone,
      customerName: notification.recipient_name || payload.customerName || 'Client',
      orderNumber: payload.orderNumber || payload.quoteNumber || 'N/A',
      orderId: notification.order_id || notification.quote_id || 'N/A',
      vehicleName: vehicleName.trim(),
      newStatus: payload.status || 'processing',
      documents,
      eta: payload.shippingEta,
      language: 'fr'
    });

    if (result.success) {
      return {
        success: true,
        messageId: result.messageId
      };
    } else {
      return {
        success: false,
        error: result.error || 'WhatsApp send failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'WhatsApp API error'
    };
  }
}

/**
 * Process document upload notification
 */
async function processDocumentNotification(notification: QueuedNotification): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // Similar to status change but with document-specific template
  return processStatusChangeNotification(notification);
}

/**
 * Process custom notification
 */
async function processCustomNotification(notification: QueuedNotification): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const payload = notification.payload;

  if (!payload.customMessage) {
    return { success: false, error: 'Missing customMessage in payload' };
  }

  try {
    // Send simple text message via Whapi
    const response = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: formatPhoneForWhapi(notification.recipient_phone),
        body: payload.customMessage
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.message?.id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send custom message'
    };
  }
}

/**
 * Format phone number for Whapi
 */
function formatPhoneForWhapi(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');

  // Add Gabon country code if no country code
  if (cleaned.length <= 9) {
    cleaned = '241' + cleaned;
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * POST /api/notifications/process
 * Process pending notifications from queue
 */
export async function POST(request: Request) {
  // Verify authorization
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Process up to MAX_BATCH_SIZE notifications
    for (let i = 0; i < MAX_BATCH_SIZE; i++) {
      const notification = await getNextNotification();

      if (!notification) {
        // No more pending notifications
        break;
      }

      results.processed++;

      // Process the notification
      const result = await processNotification(notification);

      if (result.success) {
        results.succeeded++;
        await markNotificationSent(
          notification.id,
          { messageId: result.messageId, apiResponse: { success: true } },
          result.durationMs
        );
      } else {
        results.failed++;
        results.errors.push(`${notification.id}: ${result.error}`);
        await markNotificationFailed(
          notification.id,
          {
            message: result.error || 'Unknown error',
            code: result.errorCode,
            apiResponse: { success: false, error: result.error }
          },
          result.durationMs
        );
      }
    }

    // Get current queue stats
    const stats = await getQueueStats();

    return NextResponse.json({
      success: true,
      results,
      queueStats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[NotificationWorker] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Worker error',
        results
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/process
 * Get queue statistics (for monitoring)
 */
export async function GET(request: Request) {
  // Verify authorization
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const stats = await getQueueStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stats' },
      { status: 500 }
    );
  }
}
