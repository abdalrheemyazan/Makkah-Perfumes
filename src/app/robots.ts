import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private, transactional or thin routes. Keeping them out of the index
        // protects customer data and avoids crawl budget being spent on
        // infinite filter permutations.
        disallow: [
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/cart',
          '/checkout',
          '/checkout/',
          '/api/',
          '/login',
          '/register',
          '/forgot-password',
          '/search',
          '/wishlist',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
