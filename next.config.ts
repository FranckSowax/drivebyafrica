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
    ],
  },
};

export default nextConfig;
