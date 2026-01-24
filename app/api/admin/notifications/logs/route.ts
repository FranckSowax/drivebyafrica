/**
 * Admin API for Order Status Logs
 *
 * GET: Get order status change history with filters
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Get service client
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

/**
 * GET /api/admin/notifications/logs
 * Get order status change logs with filtering
 */
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const quoteId = searchParams.get('quoteId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const supabase = getServiceClient();

    // Build query
    let query = supabase
      .from('order_status_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (orderId) {
      query = query.eq('order_id', orderId);
    }
    if (quoteId) {
      query = query.eq('quote_id', quoteId);
    }
    if (status) {
      query = query.eq('new_status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('[AdminStatusLogs] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get notification details for logs that have queue IDs
    const queueIds = logs
      ?.filter(l => l.notification_queue_id)
      .map(l => l.notification_queue_id);

    let notificationDetails: Record<string, { status: string; whatsapp_message_id: string | null; last_error: string | null }> = {};

    if (queueIds && queueIds.length > 0) {
      const { data: notifications } = await supabase
        .from('notification_queue')
        .select('id, status, whatsapp_message_id, last_error')
        .in('id', queueIds);

      if (notifications) {
        notificationDetails = notifications.reduce((acc, n) => {
          acc[n.id] = {
            status: n.status,
            whatsapp_message_id: n.whatsapp_message_id,
            last_error: n.last_error,
          };
          return acc;
        }, {} as typeof notificationDetails);
      }
    }

    // Enrich logs with notification status
    const enrichedLogs = logs?.map(log => ({
      ...log,
      notification_status: log.notification_queue_id
        ? notificationDetails[log.notification_queue_id]?.status || 'unknown'
        : null,
      notification_message_id: log.notification_queue_id
        ? notificationDetails[log.notification_queue_id]?.whatsapp_message_id
        : null,
      notification_error: log.notification_queue_id
        ? notificationDetails[log.notification_queue_id]?.last_error
        : null,
    }));

    return NextResponse.json({
      success: true,
      logs: enrichedLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AdminStatusLogs] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get logs' },
      { status: 500 }
    );
  }
}
