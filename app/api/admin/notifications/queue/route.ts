/**
 * Admin API for Notification Queue Management
 *
 * GET: Get queue statistics and recent notifications
 * POST: Retry failed notifications or cancel pending ones
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import {
  getQueueStats,
  getFailedNotifications,
  retryFailedNotification,
  cancelNotification,
} from '@/lib/notifications/notification-queue';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Get service client for admin operations
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

/**
 * GET /api/admin/notifications/queue
 * Get queue statistics and recent notifications
 */
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'stats'; // stats, failed, recent, all

    // Get queue statistics
    const stats = await getQueueStats();

    if (view === 'stats') {
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    }

    // Get additional data based on view
    const supabase = getServiceClient();

    if (view === 'failed') {
      const failed = await getFailedNotifications(50);
      return NextResponse.json({
        success: true,
        stats,
        notifications: failed,
        timestamp: new Date().toISOString(),
      });
    }

    if (view === 'recent') {
      // Get recent notifications (last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('notification_queue')
        .select('*')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(100);

      return NextResponse.json({
        success: true,
        stats,
        notifications: recent || [],
        timestamp: new Date().toISOString(),
      });
    }

    if (view === 'all') {
      // Get all pending and processing
      const { data: active } = await supabase
        .from('notification_queue')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(100);

      return NextResponse.json({
        success: true,
        stats,
        notifications: active || [],
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AdminNotificationQueue] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get queue data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notifications/queue
 * Perform actions on queue items (retry, cancel)
 */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const body = await request.json();
    const { action, queueId, queueIds } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action required' },
        { status: 400 }
      );
    }

    // Handle batch operations
    const targetIds = queueIds || (queueId ? [queueId] : []);

    if (targetIds.length === 0) {
      return NextResponse.json(
        { error: 'Queue ID(s) required' },
        { status: 400 }
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    switch (action) {
      case 'retry':
        for (const id of targetIds) {
          const success = await retryFailedNotification(id);
          results.push({ id, success, error: success ? undefined : 'Failed to retry' });
        }
        break;

      case 'cancel':
        for (const id of targetIds) {
          const success = await cancelNotification(id, `Cancelled by admin: ${adminCheck.user.email}`);
          results.push({ id, success, error: success ? undefined : 'Failed to cancel' });
        }
        break;

      case 'retry_all_failed':
        // Retry all failed notifications
        const supabase = getServiceClient();
        const { data: failed } = await supabase
          .from('notification_queue')
          .select('id')
          .eq('status', 'failed')
          .limit(100);

        if (failed) {
          for (const item of failed) {
            const success = await retryFailedNotification(item.id);
            results.push({ id: item.id, success, error: success ? undefined : 'Failed to retry' });
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      action,
      results: {
        total: results.length,
        succeeded: successCount,
        failed: failCount,
        items: results,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AdminNotificationQueue] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    );
  }
}
