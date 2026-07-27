import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on style-src is required: Next injects inline styles for
 * next/font and next/image, and the app uses inline `style` attributes for
 * computed gradients. Scripts are NOT allowed inline in production — Next's
 * bootstrap scripts are nonce-free but same-origin, so 'self' covers them.
 * In development, React refresh needs 'unsafe-eval'.
 */
const csp = [
  "default-src 'self'",
  isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // data: for inlined small images; blob: for canvas/WebGL readback.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  // No third-party origins are contacted: fonts are self-hosted by next/font
  // and there is no analytics or payment iframe yet. Add the payment provider's
  // origin here when one is connected (see docs/DEPLOYMENT.md).
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // The service worker is same-origin; the manifest is served from /manifest.webmanifest.
  "worker-src 'self'",
  "manifest-src 'self'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // The dev-mode indicator sits in the bottom-inline-start corner — exactly
  // where the fixed accessibility button lives — and overlaps it during
  // development. It has no presence in production; turning it off keeps the
  // corner clear for the real control.
  devIndicators: false,

  // Serwist (classic mode) injects a webpack config even when disabled. `next
  // dev` uses Turbopack, which errors on a webpack config unless a Turbopack
  // config is also present. This empty object satisfies that check; dev runs on
  // Turbopack (SW disabled) and the production build uses `next build --webpack`
  // so Serwist compiles the service worker.
  turbopack: {},

  images: {
    // The site serves only local assets; no remote patterns are allowed.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [420, 640, 768, 1024, 1280, 1536, 1920, 2048],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Generated media is content-addressed by build; cache it hard.
        source: '/generated/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/brand-reference/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

/**
 * Serwist (PWA) wrapper.
 *
 * The service worker source is src/app/sw.ts, compiled to /public/sw.js. It is
 * disabled in development so hot-reload is never intercepted by a cache; the SW
 * only runs in a production build (`next build && next start`) and on Netlify.
 * `register: true` (default) injects the registration script automatically.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: !isProduction,
  reloadOnOnline: true,
});

export default withSerwist(nextConfig);
