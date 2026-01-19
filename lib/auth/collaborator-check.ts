import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Result type for collaborator authentication check
 */
export type CollaboratorCheckResult =
  | {
      isCollaborator: true;
      user: { id: string; email: string };
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | {
      isCollaborator: false;
      response: NextResponse;
    };

/**
 * Result type for admin or collaborator authentication check
 */
export type AdminOrCollaboratorCheckResult =
  | {
      authorized: true;
      role: 'admin' | 'super_admin' | 'collaborator';
      user: { id: string; email: string };
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | {
      authorized: false;
      response: NextResponse;
    };

/**
 * Verify that the current user is a collaborator
 * Returns user info and supabase client if authorized
 * Returns error response if not authorized
 */
export async function requireCollaborator(): Promise<CollaboratorCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isCollaborator: false,
      response: NextResponse.json(
        { error: 'Authentication required', error_zh: '需要身份验证' },
        { status: 401 }
      ),
    };
  }

  // Check role in profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;
  const isCollaboratorRole = role === 'collaborator';

  if (!isCollaboratorRole) {
    return {
      isCollaborator: false,
      response: NextResponse.json(
        { error: 'Access restricted to collaborators', error_zh: '仅限协作者访问' },
        { status: 403 }
      ),
    };
  }

  return {
    isCollaborator: true,
    user: { id: user.id, email: user.email || '' },
    supabase,
  };
}

/**
 * Verify that the current user is either an admin or a collaborator
 * Useful for shared endpoints where both roles need access
 */
export async function requireAdminOrCollaborator(): Promise<AdminOrCollaboratorCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication required', error_zh: '需要身份验证' },
        { status: 401 }
      ),
    };
  }

  // Check role in profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;
  const authorizedRoles = ['admin', 'super_admin', 'collaborator'];

  if (!role || !authorizedRoles.includes(role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Access denied', error_zh: '访问被拒绝' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    role: role as 'admin' | 'super_admin' | 'collaborator',
    user: { id: user.id, email: user.email || '' },
    supabase,
  };
}

/**
 * Log collaborator activity for audit purposes
 */
export async function logCollaboratorActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collaboratorId: string,
  actionType: 'status_update' | 'document_upload' | 'login' | 'logout' | 'view_order',
  details: {
    orderId?: string;
    quoteId?: string;
    oldStatus?: string;
    newStatus?: string;
    documentName?: string;
    note?: string;
    [key: string]: unknown;
  },
  request?: Request
): Promise<void> {
  try {
    // Extract IP and user agent from request if available
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        null;
      userAgent = request.headers.get('user-agent') || null;
    }

    await supabase.from('collaborator_activity_log').insert({
      collaborator_id: collaboratorId,
      action_type: actionType,
      order_id: details.orderId || null,
      quote_id: details.quoteId || null,
      details: JSON.parse(JSON.stringify(details)),
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    // Log but don't throw - activity logging should not break main operations
    console.error('Failed to log collaborator activity:', error);
  }
}
