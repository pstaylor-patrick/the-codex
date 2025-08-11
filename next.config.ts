import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (
    config: Configuration,
    { isServer }
  ): Configuration => {
    if (!isServer) {
      config.resolve = {
        ...(config.resolve || {}),
        fallback: {
          ...(config.resolve?.fallback || {}),
          dns: false,
          fs: false,
          net: false,
          tls: false,
          'pg-native': false,
        },
      };
    }
    return config;
  },

  // This is for development
  allowedDevOrigins: [
    'https://3000-firebase-the-codex-1753381827295.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev',
  ],


  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
