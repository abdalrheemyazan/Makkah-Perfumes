import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { variantLabel } from '@/lib/commerce/labels';

/**
 * Cache tags for public, non-user-specific catalogue data. Admin product
 * mutations call `revalidateTag(CATALOG_TAGS.products)` to drop these caches;
 * the modest `revalidate` window means card-level stock display also self-heals
 * on its own without needing an admin action. Purchase validation never reads
 * these caches — `addToCart` and `createOrder` always query live inventory.
 */
export const CATALOG_TAGS = {
  products: 'products',
  fragranceFamilies: 'fragrance-families',
} as const;

export function productTag(slug: string): string {
  return `product:${slug}`;
}

/**
 * Catalogue read model.
 *
 * Pages consume `ProductCard` / `ProductDetail` rather than raw Prisma rows, so
 * stock and price logic lives in one place instead of being re-derived in JSX.
 */

export type ProductCard = {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string;
  imageUrl: string | null;
  imageAltHe: string;
  priceAgorot: number;
  compareAtAgorot: number | null;
  pricingVerified: boolean;
  variantId: string;
  variantLabel: string;
  familyNameHe: string | null;
  familySlug: string | null;
  inStock: boolean;
  availableQuantity: number;
  isNewArrival: boolean;
};

const cardSelect = {
  id: true,
  slug: true,
  nameHe: true,
  nameEn: true,
  pricingVerified: true,
  isNewArrival: true,
  fragranceFamily: { select: { nameHe: true, slug: true } },
  images: { where: { isPrimary: true }, take: 1, select: { url: true, altHe: true } },
  variants: {
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
    take: 1,
    select: {
      id: true,
      priceAgorot: true,
      compareAtAgorot: true,
      volumeMl: true,
      concentration: true,
      inventoryItem: {
        select: { quantityOnHand: true, quantityReserved: true, allowBackorder: true },
      },
    },
  },
} satisfies Prisma.ProductSelect;

/** Derived from the select above, so the two can never drift apart. */
type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

function toCard(row: CardRow): ProductCard | null {
  const variant = row.variants[0];
  // A product with no active variant cannot be bought, so it is not listed.
  if (!variant) return null;

  const inventory = variant.inventoryItem;
  const available = inventory
    ? Math.max(0, inventory.quantityOnHand - inventory.quantityReserved)
    : 0;
  const image = row.images[0] ?? null;

  return {
    id: row.id,
    slug: row.slug,
    nameHe: row.nameHe,
    nameEn: row.nameEn,
    imageUrl: image?.url ?? null,
    imageAltHe: image?.altHe ?? row.nameHe,
    priceAgorot: variant.priceAgorot,
    compareAtAgorot: variant.compareAtAgorot,
    pricingVerified: row.pricingVerified,
    variantId: variant.id,
    variantLabel: variantLabel(variant.volumeMl, variant.concentration),
    familyNameHe: row.fragranceFamily?.nameHe ?? null,
    familySlug: row.fragranceFamily?.slug ?? null,
    inStock: available > 0 || (inventory?.allowBackorder ?? false),
    availableQuantity: available,
    isNewArrival: row.isNewArrival,
  };
}

const featuredProductsCached = unstable_cache(
  async (limit: number): Promise<ProductCard[]> => {
    const rows = await db.product.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      select: cardSelect,
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCard).filter((card): card is ProductCard => card !== null);
  },
  ['featured-products'],
  { tags: [CATALOG_TAGS.products], revalidate: 300 },
);

export async function getFeaturedProducts(limit = 6): Promise<ProductCard[]> {
  return featuredProductsCached(limit);
}

export const getFragranceFamilies = unstable_cache(
  async () =>
    db.fragranceFamily.findMany({
      orderBy: { position: 'asc' },
      select: {
        id: true,
        slug: true,
        nameHe: true,
        descriptionHe: true,
        accentColor: true,
        _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
      },
    }),
  ['fragrance-families'],
  { tags: [CATALOG_TAGS.products, CATALOG_TAGS.fragranceFamilies], revalidate: 600 },
);

export { cardSelect, toCard };
export type { CardRow };
