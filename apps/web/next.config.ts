import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No rewrites needed - using Next.js API routes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
