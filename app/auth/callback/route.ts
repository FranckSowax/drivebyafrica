import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// SECURITY: Validate redirect URL to prevent open redirect attacks
function isValidRedirectPath(path: string, origin: string): boolean {
  // Must start with single slash (not //)
  if (!path.startsWith('/') || path.startsWith('//')) return false;

  try {
    // Decode and check again for double-encoding attacks
    const decoded = decodeURIComponent(path);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return false;

    // Parse to ensure it's a valid relative path
    const testUrl = new URL(decoded, origin);
    // Ensure host matches (prevent protocol-relative URLs)
    if (testUrl.origin !== origin) return false;

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Default to home page, not dashboard - user returns to where they were
  const next = searchParams.get('next') ?? '/';

  // Validate the redirect path
  const safePath = isValidRedirectPath(next, origin) ? next : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
