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
 * Parse images field that might be stored as PostgreSQL array string
 * e.g., '{"url1","url2"}' or '{url1,url2}' -> ['url1', 'url2']
 */
export function parseImagesField(images: string[] | string | null | undefined): string[] {
  if (!images) return [];

  // Already an array
  if (Array.isArray(images)) {
    return images.filter(Boolean);
  }

  // PostgreSQL array format: {url1,url2} or {"url1","url2"}
  if (typeof images === 'string') {
    // Empty array
    if (images === '{}' || images === '') return [];

    // Remove curly braces and split
    const content = images.slice(1, -1);
    if (!content) return [];

    // Handle quoted strings: {"url1","url2"}
    if (content.startsWith('"')) {
      const urls: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '"' && content[i - 1] !== '\\') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          if (current) urls.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      if (current) urls.push(current);
      return urls.filter(Boolean);
    }

    // Simple comma-separated
    return content.split(',').map(s => s.trim()).filter(Boolean);
  }

  return [];
}

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
