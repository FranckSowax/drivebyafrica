import { createClient } from './client';

/**
 * Get the current session token for API calls.
 * This is used when making fetch requests to our API routes.
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
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
