import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  trailingSlash: false,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      // Encar Korea images
      {
        protocol: 'https',
        hostname: 'ci.encar.com',
      },
      {
        protocol: 'https',
        hostname: 'ci.encar.com',
      },
      // Dongchedi China images (byteimg.com CDN)
      {
        protocol: 'https',
        hostname: '**.byteimg.com',
      },
      // CHE168 China images (autoimg.cn CDN)
      {
        protocol: 'https',
        hostname: '**.autoimg.cn',
      },
      // Dubicars Dubai images
      {
        protocol: 'https',
        hostname: 'www.dubicars.com',
      },
      {
        protocol: 'https',
        hostname: 'dubicars.com',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: true,
  // Disable source map upload until SENTRY_AUTH_TOKEN is configured
  sourcemaps: {
    disable: true,
  },
});
