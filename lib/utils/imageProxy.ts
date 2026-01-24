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
 * Also handles JSON array strings: '["url1","url2"]'
 */
export function parseImagesField(images: string[] | string | null | undefined): string[] {
  if (!images) return [];

  // Already an array
  if (Array.isArray(images)) {
    return images.filter(Boolean).filter(url => typeof url === 'string' && url.trim());
  }

  // String format handling
  if (typeof images === 'string') {
    const trimmed = images.trim();

    // Empty array formats
    if (trimmed === '{}' || trimmed === '[]' || trimmed === '') return [];

    // Try JSON parse first (handles ["url1","url2"])
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).filter(url => typeof url === 'string' && url.trim());
        }
      } catch {
        // Fall through to manual parsing
      }
    }

    // PostgreSQL array format: {url1,url2} or {"url1","url2"}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const content = trimmed.slice(1, -1);
      if (!content) return [];

      // Handle quoted strings: {"url1","url2"}
      if (content.startsWith('"')) {
        const urls: string[] = [];
        let current = '';
        let inQuotes = false;
        let escaped = false;

        for (let i = 0; i < content.length; i++) {
          const char = content[i];

          if (escaped) {
            current += char;
            escaped = false;
            continue;
          }

          if (char === '\\') {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            if (current) urls.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        if (current) urls.push(current);
        return urls.filter(url => url && url.startsWith('http'));
      }

      // Simple comma-separated (rare, but handle it)
      return content.split(',').map(s => s.trim()).filter(url => url && url.startsWith('http'));
    }

    // Single URL
    if (trimmed.startsWith('http')) {
      return [trimmed];
    }
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
 * Simple hash function for cache-busting
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get the proxied URL for an image
 * Uses proxy for autoimg.cn (CHE168) which blocks requests with external Referer.
 * byteimg.com (Dongchedi) images work directly.
 */
export function getProxiedImageUrl(url: string): string {
  if (!url) return url;

  // Use proxy for autoimg.cn (CHE168) - blocks external Referer
  if (url.includes('autoimg.cn')) {
    // Add hash of URL as cache key to ensure Netlify CDN treats each URL uniquely
    const hash = simpleHash(url);
    return `/api/image-proxy?url=${encodeURIComponent(url)}&h=${hash}`;
  }

  // Return URL as-is for other domains (byteimg.com works directly)
  return url;
}

/**
 * Process an array of image URLs
 */
export function getProxiedImageUrls(urls: string[] | null | undefined): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(getProxiedImageUrl);
}
