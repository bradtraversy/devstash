import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  devIndicators: false,
  async rewrites() {
    // Public collection markdown lives at /{handle}/{slug}.md and a shared item's image at /s/{shortId}.png;
    // static routes and files still win (afterFiles).
    return [
      { source: '/:handle/:slug.md', destination: '/:handle/:slug/raw' },
      { source: '/s/:shortId.png', destination: '/s/:shortId/image' },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
    ],
  },
};

export default nextConfig;
