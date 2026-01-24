import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Protect collaborator routes (except login page)
  if (!user && request.nextUrl.pathname.startsWith('/collaborator') && request.nextUrl.pathname !== '/collaborator/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/collaborator/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in collaborators away from collaborator login page
  if (user && request.nextUrl.pathname === '/collaborator/login') {
    const url = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get('redirect');
    // Use same redirect validation as below
    const isValidPath = (path: string): boolean => {
      if (!path.startsWith('/') || path.startsWith('//')) return false;
      try {
        const decoded = decodeURIComponent(path);
        if (!decoded.startsWith('/') || decoded.startsWith('//')) return false;
        const testUrl = new URL(decoded, request.url);
        if (testUrl.origin !== request.nextUrl.origin) return false;
        return true;
      } catch {
        return false;
      }
    };
    if (redirectTo && isValidPath(redirectTo)) {
      url.pathname = decodeURIComponent(redirectTo);
    } else {
      url.pathname = '/collaborator';
    }
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register' || request.nextUrl.pathname === '/forgot-password')) {
    const url = request.nextUrl.clone();
    // Respect the redirect parameter if present, otherwise go to home page
    const redirectTo = request.nextUrl.searchParams.get('redirect');

    // SECURITY: Validate redirect URL to prevent open redirect attacks
    const isValidRedirect = (path: string): boolean => {
      // Must start with single slash (not //)
      if (!path.startsWith('/') || path.startsWith('//')) return false;
      // Decode and check again for double-encoding attacks
      try {
        const decoded = decodeURIComponent(path);
        if (!decoded.startsWith('/') || decoded.startsWith('//')) return false;
        // Parse to ensure it's a valid relative path
        const testUrl = new URL(decoded, request.url);
        // Ensure host matches (prevent protocol-relative URLs)
        if (testUrl.origin !== request.nextUrl.origin) return false;
        return true;
      } catch {
        return false;
      }
    };

    if (redirectTo && isValidRedirect(redirectTo)) {
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
