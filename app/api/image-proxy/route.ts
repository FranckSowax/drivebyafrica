import { NextRequest, NextResponse } from 'next/server';

// Allowed image domains for security
const ALLOWED_DOMAINS = [
  'byteimg.com',
  'p1-dcd.byteimg.com',
  'p3-dcd.byteimg.com',
  'p6-dcd.byteimg.com',
  'p9-dcd.byteimg.com',
  'tosv.byted.org',
  'dongchedi.com',
  'autoimg.cn',  // CHE168 images
];

/**
 * Calculate appropriate cache duration based on image URL expiry
 * Dongchedi images have x-expires parameter with Unix timestamp
 */
function getCacheControl(url: string): string {
  // Check for x-expires parameter
  const expiresMatch = url.match(/x-expires=(\d+)/);
  if (expiresMatch) {
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
    const now = Date.now();
    const remainingSeconds = Math.floor((expiresTimestamp - now) / 1000);

    if (remainingSeconds <= 0) {
      // Already expired - no cache
      return 'no-store';
    }

    // Cache for remaining time minus 1 hour buffer, max 24 hours
    const cacheSeconds = Math.min(Math.max(remainingSeconds - 3600, 60), 86400);
    return `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`;
  }

  // Default for non-expiring images: cache for 7 days
  return 'public, max-age=604800, s-maxage=604800';
}

function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Decode the URL - handle potential double-encoding
  let decodedUrl = imageUrl;
  try {
    // First decode
    decodedUrl = decodeURIComponent(imageUrl);
    // Check if still encoded (double-encoding case)
    if (decodedUrl.includes('%')) {
      decodedUrl = decodeURIComponent(decodedUrl);
    }
  } catch {
    // If decoding fails, use as-is
    decodedUrl = imageUrl;
  }

  // Security check
  if (!isAllowedDomain(decodedUrl)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    // Determine the appropriate Referer based on the image domain
    const referer = decodedUrl.includes('autoimg.cn')
      ? 'https://www.che168.com/'
      : 'https://www.dongchedi.com/';

    // Fetch the image with appropriate headers
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': referer,
      },
      // No cache on fetch to always get fresh from origin
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Image proxy failed: ${response.status} for ${decodedUrl}`);
      return NextResponse.json(
        { error: 'Failed to fetch image', status: response.status },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    // Calculate cache control based on image expiry
    const cacheControl = getCacheControl(decodedUrl);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Disable CDN caching - each URL must be fetched individually
        // Browser can still cache based on the URL
        'Cache-Control': 'private, max-age=86400',
        'CDN-Cache-Control': 'no-store',
        'Netlify-CDN-Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
