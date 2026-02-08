import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Simple in-memory rate limiter for login_failed (max 10 per IP per 5 minutes)
const failedLoginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILED_PER_IP = 10;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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

    // Extract IP and user agent
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // For login_failed, we don't have an authenticated user
    // Use supabaseAdmin (service role) to insert directly
    if (actionType === 'login_failed') {
      // Rate limit login_failed by IP to prevent spam
      const ip = ipAddress || 'unknown';
      const now = Date.now();
      const entry = failedLoginAttempts.get(ip);
      if (entry && now < entry.resetAt) {
        if (entry.count >= MAX_FAILED_PER_IP) {
          return NextResponse.json({ ok: true }); // Silent drop — don't reveal rate limiting
        }
        entry.count++;
      } else {
        failedLoginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      }

      // Validate details.email if provided
      const email = typeof details?.email === 'string' ? details.email.slice(0, 255) : undefined;

      await (supabaseAdmin
        .from('collaborator_activity_log') as any)
        .insert({
          action_type: 'login',
          details: { email, success: false },
          ip_address: ipAddress,
          user_agent: userAgent?.slice(0, 500) || null,
        });

      return NextResponse.json({ ok: true });
    }

    // For login/logout, get the authenticated user
    const supabase = await createClient();
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
