import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/collaborator/log-activity
 * Logs collaborator actions (login, logout, login_failed) to collaborator_activity_log
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionType, details } = body;

    const validActions = ['login', 'logout', 'login_failed'];
    if (!actionType || !validActions.includes(actionType)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    const supabase = await createClient();

    // Extract IP and user agent
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // For login_failed, we don't have an authenticated user
    if (actionType === 'login_failed') {
      const { error } = await supabase.from('collaborator_activity_log').insert({
        collaborator_id: null,
        action_type: 'login',
        details: {
          ...details,
          success: false,
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      if (error) {
        console.error('[CollabLog] Failed to log login_failed:', error);
      }

      return NextResponse.json({ ok: true });
    }

    // For login/logout, get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await supabase.from('collaborator_activity_log').insert({
      collaborator_id: user.id,
      action_type: actionType,
      details: {
        ...details,
        success: true,
        email: user.email,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error(`[CollabLog] Failed to log ${actionType}:`, error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[CollabLog] Error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
