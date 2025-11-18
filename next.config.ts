import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
    ],
  },
  // Externalize pdf-parse to avoid bundling issues
  // Note: pdfjs-dist is ESM and can't be externalized, so we only externalize pdf-parse
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
