import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent double slash issues
  trailingSlash: false,
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
        protocol: 'http',
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

export default nextConfig;
