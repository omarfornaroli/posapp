
import type {NextConfig} from 'next';
import withPWA from 'next-pwa';
import runtime from 'next-pwa/cache';

const pwaConfig = {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    buildExcludes: [/app-build-manifest\.json$/], // Exclude this file from precaching
    runtimeCaching: [
      {
        urlPattern: /(\/login|\/setup-account|\/reset-password|\/reports)/,
        handler: 'NetworkOnly'
      },
      ...runtime,
    ],
};

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: [
    '@opentelemetry/sdk-node', 
    'handlebars'
  ],
};

const pwaPlugin = withPWA(pwaConfig);

export default pwaPlugin(nextConfig);
