import type { MetadataRoute } from 'next';

/**
 * Web App Manifest, served at /manifest.webmanifest.
 *
 * Hebrew, RTL, brand-dark. Icons include both `any` and `maskable` purposes at
 * 192 and 512 so Android can render an adaptive icon without letterboxing.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Makkah Perfumes',
    short_name: 'Makkah',
    description: 'חנות הדגל הרשמית של מכה פרפיומס — בשמי יוקרה, לבונה וקטורת.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    lang: 'he',
    dir: 'rtl',
    theme_color: '#0b0a08',
    background_color: '#0b0a08',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png?v=20260730', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=20260730', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png?v=20260730', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png?v=20260730', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
