'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE = '/images/placeholder-car.svg';

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
 *
 * Falls back to placeholder on error or missing src.
 *
 * For CHE168 images (autoimg.cn), uses proxy to bypass CORS.
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

  // Determine the image URL
  const getImageUrl = () => {
    if (!src || imgError) return PLACEHOLDER_IMAGE;

    // Use proxy for CHE168 images (autoimg.cn) which block external Referer
    if (useProxy && src.includes('autoimg.cn')) {
      // Hash for cache busting
      const hash = simpleHash(src);
      return `/api/image-proxy?url=${encodeURIComponent(src)}&h=${hash}`;
    }

    return src;
  };

  const imageUrl = getImageUrl();
  const isPlaceholder = imageUrl === PLACEHOLDER_IMAGE;

  // Use unoptimized for proxy images (already processed server-side)
  // and for placeholder images (local SVG)
  const shouldUnoptimize = imageUrl.startsWith('/api/image-proxy') || isPlaceholder;

  const handleLoad = () => {
    setIsLoading(false);
    onLoadingComplete?.();
  };

  const handleError = () => {
    setImgError(true);
    setIsLoading(false);
  };

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
