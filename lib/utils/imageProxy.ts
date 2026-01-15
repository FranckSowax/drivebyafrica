/**
 * Transforms external image URLs to use our proxy for images that have
 * signed URLs (x-expires) or are from Chinese CDNs that block direct access.
 */

const PROXY_DOMAINS = [
  'byteimg.com',
  'tosv.byted.org',
  'dongchedi.com',
];

/**
 * Check if an image URL needs to be proxied
 */
export function needsProxy(url: string): boolean {
  if (!url || !url.startsWith('http')) return false;

  // Check if URL contains signature parameters (will expire)
  if (url.includes('x-expires') || url.includes('x-signature')) {
    return true;
  }

  // Check if URL is from a domain that needs proxying
  return PROXY_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Get the proxied URL for an image
 */
export function getProxiedImageUrl(url: string): string {
  if (!url) return url;

  // Don't proxy local images or already proxied images
  if (!url.startsWith('http') || url.includes('/api/image-proxy')) {
    return url;
  }

  // Only proxy images that need it
  if (!needsProxy(url)) {
    return url;
  }

  // Encode the URL for the proxy
  const encodedUrl = encodeURIComponent(url);
  return `/api/image-proxy?url=${encodedUrl}`;
}

/**
 * Process an array of image URLs
 */
export function getProxiedImageUrls(urls: string[] | null | undefined): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(getProxiedImageUrl);
}
