/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,

  // Security Headers - FIXED: Removed COEP/COOP to prevent ERR_BLOCKED_BY_RESPONSE
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // NOTE: Removed Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy
          // to prevent ERR_BLOCKED_BY_RESPONSE with third-party scripts (Pi SDK, etc.)
        ],
      },
    ];
  },

  // Environment variables exposed to client - DYNAMIC
  env: {
    PI_NETWORK: process.env.PI_NETWORK || 'testnet',
    PI_API_BASE_URL: process.env.PI_API_BASE_URL,
    PI_APP_ID: process.env.PI_APP_ID,
  },

  // Image optimization
  images: {
    domains: ['api.minepi.com'],
    formats: ['image/webp', 'image/avif'],
  },

  compress: true,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
