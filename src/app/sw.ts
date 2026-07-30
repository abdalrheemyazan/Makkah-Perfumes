/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist';

/**
 * Makkah Perfumes service worker (Serwist).
 *
 * Caching policy is deliberately conservative — the shop must stay
 * server-authoritative. Anything private or transactional is NetworkOnly, so a
 * stale cache can never authorize a purchase or leak another session's data.
 *
 *   NetworkOnly            /admin /account /orders /cart /checkout /wishlist
 *                          /login /register /forgot-password /api, all non-GET
 *                          (Server Actions & mutations)
 *   CacheFirst             /_next/static (content-hashed, immutable) + fonts
 *   StaleWhileRevalidate   optimized images, brand media, PWA icons
 *   NetworkFirst           public page navigations, with an offline fallback
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

// Private / transactional / auth / API — never served from cache.
const PRIVATE_PATH =
  /^\/(admin|account|orders|cart|checkout|wishlist|login|register|forgot-password|api)(\/|$)/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Anything private or transactional: always live, never cached.
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && PRIVATE_PATH.test(url.pathname),
      handler: new NetworkOnly(),
    },
    // 2. Mutations / Server Actions (any non-GET): always live.
    {
      matcher: ({ request }) => request.method !== 'GET',
      handler: new NetworkOnly(),
    },
    // 3. Content-hashed build assets (JS, CSS, self-hosted fonts): cache-first.
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({
        cacheName: 'static-assets-v3',
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
    // 4. Next optimized images: revalidate in the background.
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/image'),
      handler: new StaleWhileRevalidate({
        cacheName: 'next-image-v3',
        plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    // 5. Public brand media, generated assets and PWA icons: revalidate.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && /^\/(brand-reference|generated|icons)\//.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: 'public-media-v3',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    // 6. Manifest & favicon: revalidate.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && /^\/(manifest\.webmanifest|favicon\.ico|apple-touch-icon\.png)$/.test(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: 'meta-v3' }),
    },
    // 7. Public page navigations: network-first, fall back to the offline page.
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages-v3',
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.mode === 'navigate',
      },
    ],
  },
});

serwist.addEventListeners();

// --- Web Push -------------------------------------------------------------
// Restock notifications. The payload is produced by src/lib/notifications/push.ts.
self.addEventListener('push', (event) => {
  const fallback = { title: 'Makkah Perfumes', body: '', url: '/' };
  let payload: { title?: string; body?: string; url?: string; icon?: string; image?: string; tag?: string } =
    fallback;
  if (event.data) {
    try {
      payload = { ...fallback, ...(event.data.json() as object) };
    } catch {
      payload = { ...fallback, body: event.data.text() };
    }
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png?v=20260730',
    badge: '/icons/icon-192.png?v=20260730',
    dir: 'rtl',
    lang: 'he',
    tag: payload.tag,
    data: { url: payload.url || '/' },
    // `image` is supported on Android but not typed in every lib version.
    ...(payload.image ? { image: payload.image } : {}),
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(payload.title || 'Makkah Perfumes', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url || '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        // Reuse an existing tab if one is open.
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await (client as WindowClient).navigate(target);
            } catch {
              /* cross-origin or unsupported — fall through to open */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
