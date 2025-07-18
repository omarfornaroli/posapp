
import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withPWA from 'next-pwa';
import runtime from 'next-pwa/cache';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const pwaConfig = {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
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

// First, apply the next-intl plugin to the base config
const configWithIntl = withNextIntl(nextConfig);

// Then, apply the PWA plugin to the result of the intl plugin
// We use `as any` here to resolve a deep type incompatibility between plugins.
export default pwaPlugin(configWithIntl as any);
