'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE = '/images/placeholder-car.svg';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Chinese CDN domains that need proxy
const CHINA_CDN_DOMAINS = [
  'autoimg.cn',      // CHE168
  'byteimg.com',     // Dongchedi
  'tosv.byted.org',  // Dongchedi alt
  'dongchedi.com',   // Dongchedi direct
];

// A tiny blurred placeholder for loading state
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#333" offset="20%" />
      <stop stop-color="#222" offset="50%" />
      <stop stop-color="#333" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#333" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

const blurDataURL = (w: number, h: number) =>
  `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;

/**
 * Check if URL is from a Chinese CDN that needs proxy
 */
function needsProxy(url: string): boolean {
  return CHINA_CDN_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Check if a signed URL has expired (Dongchedi uses x-expires parameter)
 */
function isUrlExpired(url: string): boolean {
  const match = url.match(/x-expires=(\d+)/);
  if (!match) return false;
  const expiresTimestamp = parseInt(match[1]) * 1000;
  return Date.now() > expiresTimestamp;
}

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  onLoadingComplete?: () => void;
  useProxy?: boolean;
}

/**
 * Optimized image component using Next.js Image for:
 * - Automatic WebP/AVIF conversion
 * - Responsive srcsets
 * - Lazy loading with blur placeholder
 * - Automatic size optimization
 * - Auto-retry on failure
 *
 * Falls back to placeholder on error or missing src.
 *
 * For Chinese CDN images (autoimg.cn, byteimg.com, etc.), uses proxy to bypass CORS/Referer blocks.
 */
export function OptimizedImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  quality = 75,
  onLoadingComplete,
  useProxy = true,
}: OptimizedImageProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Reset error state when src changes
  useEffect(() => {
    setImgError(false);
    setRetryCount(0);
    setIsLoading(true);
  }, [src]);

  // Determine the image URL
  const getImageUrl = useCallback(() => {
    if (!src || imgError) return PLACEHOLDER_IMAGE;

    // If the signed URL has expired, show placeholder immediately (no retry needed)
    if (isUrlExpired(src)) return PLACEHOLDER_IMAGE;

    // Use proxy for Chinese CDN images that block external Referer
    if (useProxy && needsProxy(src)) {
      // Add retry count to bust cache on retry
      const hash = simpleHash(src) + (retryCount > 0 ? `-r${retryCount}` : '');
      return `/api/image-proxy?url=${encodeURIComponent(src)}&h=${hash}`;
    }

    return src;
  }, [src, imgError, useProxy, retryCount]);

  const imageUrl = getImageUrl();
  const isPlaceholder = imageUrl === PLACEHOLDER_IMAGE;

  // Use unoptimized for proxy images (already processed server-side)
  // and for placeholder images (local SVG)
  const shouldUnoptimize = imageUrl.startsWith('/api/image-proxy') || isPlaceholder;

  const handleLoad = () => {
    setIsLoading(false);
    onLoadingComplete?.();
  };

  const handleError = useCallback(() => {
    // Don't retry expired signed URLs - they won't become valid again
    const expired = src ? isUrlExpired(src) : false;

    // Try to retry before showing placeholder (only for non-expired transient errors)
    if (!expired && retryCount < MAX_RETRIES && src && needsProxy(src)) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoading(true);
      }, RETRY_DELAY);
    } else {
      setImgError(true);
      setIsLoading(false);
    }
  }, [retryCount, src]);

  const imageProps = {
    src: imageUrl,
    alt,
    quality,
    className: cn(
      'transition-opacity duration-300',
      isLoading ? 'opacity-0' : 'opacity-100',
      className
    ),
    onLoad: handleLoad,
    onError: handleError,
    unoptimized: shouldUnoptimize,
    ...(priority ? { priority: true } : { loading: 'lazy' as const }),
    ...(!isPlaceholder && !shouldUnoptimize && {
      placeholder: 'blur' as const,
      blurDataURL: blurDataURL(width || 400, height || 300),
    }),
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
        sizes={sizes}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  return (
    <Image
      {...imageProps}
      width={width || 400}
      height={height || 300}
      sizes={sizes}
    />
  );
}

// Simple hash function for cache-busting (duplicated for self-contained component)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
