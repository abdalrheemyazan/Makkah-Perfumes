import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { SITE } from '@/lib/site';

/**
 * Sitemap.
 *
 * Only genuinely public, indexable URLs. Account, cart, checkout, search and
 * the entire admin are excluded — they are either private or thin.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/collections`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/fragrance-finder`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/frankincense-and-incense`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/stores`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/journal`, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/shipping-and-returns`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/accessibility`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/cookies`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const [products, collections, posts] = await Promise.all([
    db.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
    db.collection.findMany({ where: { isPublished: true }, select: { slug: true } }),
    db.journalPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: `${base}/shop/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...collections.map((collection) => ({
      url: `${base}/collections/${collection.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${base}/journal/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}
