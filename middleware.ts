import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// SECURITY: Validate redirect URL to prevent open redirect attacks
function isValidRedirectPath(path: string, origin: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  try {
    const decoded = decodeURIComponent(path);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return false;
    const testUrl = new URL(decoded, origin);
    if (testUrl.origin !== origin) return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Create a Supabase client that reads/writes cookies on request/response.
  // This refreshes expired tokens automatically on every request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward cookie writes to both the request (for downstream server code)
          // and the response (so the browser stores them).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() validates the JWT with Supabase Auth server.
  // Do NOT use getSession() here — it only reads from cookies without validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const origin = request.nextUrl.origin;

  // --- Protected routes ---

  // Protect dashboard routes
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Protect collaborator routes (except login page)
  if (!user && pathname.startsWith('/collaborator') && pathname !== '/collaborator/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/collaborator/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Protect admin routes (except login page)
  if (!user && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // --- Redirect authenticated users away from auth pages ---

  // Redirect logged-in collaborators away from collaborator login page
  if (user && pathname === '/collaborator/login') {
    const url = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get('redirect');
    if (redirectTo && isValidRedirectPath(redirectTo, origin)) {
      url.pathname = decodeURIComponent(redirectTo);
    } else {
      url.pathname = '/collaborator';
    }
    return NextResponse.redirect(url);
  }

  // Redirect logged-in admins away from admin login page
  if (user && pathname === '/admin/login') {
    const url = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get('redirect');
    if (redirectTo && isValidRedirectPath(redirectTo, origin)) {
      url.pathname = decodeURIComponent(redirectTo);
    } else {
      url.pathname = '/admin';
    }
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from user auth pages
  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password')) {
    const url = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get('redirect');
    if (redirectTo && isValidRedirectPath(redirectTo, origin)) {
      const decodedRedirect = decodeURIComponent(redirectTo);
      const redirectUrl = new URL(decodedRedirect, request.url);
      url.pathname = redirectUrl.pathname;
      url.search = redirectUrl.search;
    } else {
      url.pathname = '/';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
