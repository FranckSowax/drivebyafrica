import { createClient } from './client';

/**
 * Get the current session token for API calls.
 * This is used when making fetch requests to our API routes.
 *
 * Uses getSession() first (fast, from localStorage), then validates/refreshes
 * if the session is expired or about to expire.
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();

  // First, try to get cached session (fast)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    console.log('authHelpers: No cached session found');
    return null;
  }

  // Check if token is about to expire (within 60 seconds)
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const isExpiringSoon = expiresAt && (expiresAt - now < 60);

  if (isExpiringSoon) {
    console.log('authHelpers: Token expiring soon, refreshing...');
    // Try to refresh the session
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !refreshedSession?.access_token) {
      console.log('authHelpers: Token refresh failed, validating with getUser...');
      // Refresh failed, validate with server
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('authHelpers: Session invalid, clearing...');
        // Session is truly invalid, sign out to clear localStorage
        await supabase.auth.signOut();
        return null;
      }
      // getUser succeeded, get fresh session
      const { data: { session: validSession } } = await supabase.auth.getSession();
      return validSession?.access_token || null;
    }

    return refreshedSession.access_token;
  }

  return session.access_token;
}

/**
 * Get headers with Authorization token for API calls.
 * Use this when making fetch requests to protected API routes.
 *
 * @example
 * const headers = await getAuthHeaders();
 * const response = await fetch('/api/protected', { headers });
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make an authenticated fetch request to our API routes.
 * Automatically includes the Authorization header with the Supabase token.
 *
 * @example
 * const response = await authFetch('/api/quotes', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}
