import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import type { Concentration } from '@/generated/prisma/enums';
import { cardSelect, toCard, type ProductCard } from '@/lib/catalog';
import type { SortValue } from '@/lib/site';

/**
 * Catalogue search and filtering.
 *
 * All filtering happens in SQL. The URL is the single source of truth for
 * filter state, which makes every result shareable and back-button friendly.
 */

// The full catalogue (13 official products) must fit on a single page — a page
// size of 12 stranded one product alone on page 2. 24 keeps room to grow while
// showing everything at once for the current catalogue.
export const PAGE_SIZE = 24;

export type ShopFilters = {
  query: string | null;
  families: string[];
  collections: string[];
  concentrations: string[];
  volumes: number[];
  minPriceAgorot: number | null;
  maxPriceAgorot: number | null;
  inStockOnly: boolean;
  newArrivalsOnly: boolean;
  onSaleOnly: boolean;
  sort: SortValue;
  page: number;
};

/** Reads and sanitises filters from the URL. Unknown values are dropped. */
export function parseShopFilters(
  params: Record<string, string | string[] | undefined>,
): ShopFilters {
  const list = (key: string): string[] => {
    const value = params[key];
    if (!value) return [];
    const raw = Array.isArray(value) ? value : [value];
    return raw.flatMap((entry) => entry.split(',')).map((s) => s.trim()).filter(Boolean);
  };

  const single = (key: string): string | null => {
    const value = params[key];
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
  };

  const positiveInt = (key: string): number | null => {
    const raw = single(key);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const sortRaw = single('sort');
  const sort: SortValue =
    sortRaw === 'newest' ||
    sortRaw === 'price-asc' ||
    sortRaw === 'price-desc' ||
    sortRaw === 'bestsellers'
      ? sortRaw
      : 'recommended';

  const page = Math.max(1, positiveInt('page') ?? 1);

  return {
    query: single('q')?.trim() || null,
    families: list('family'),
    collections: list('collection'),
    concentrations: list('concentration'),
    volumes: list('volume')
      .map((v) => Number.parseInt(v, 10))
      .filter((v) => Number.isFinite(v)),
    // Prices arrive in shekels for readable URLs, and are converted to agorot here.
    minPriceAgorot: positiveInt('minPrice') !== null ? positiveInt('minPrice')! * 100 : null,
    maxPriceAgorot: positiveInt('maxPrice') !== null ? positiveInt('maxPrice')! * 100 : null,
    inStockOnly: single('inStock') === '1',
    newArrivalsOnly: single('new') === '1',
    onSaleOnly: single('sale') === '1',
    sort,
    page,
  };
}

function buildWhere(filters: ShopFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: 'PUBLISHED' }];

  if (filters.query) {
    // Search Hebrew and English names plus the description, case-insensitively.
    and.push({
      OR: [
        { nameHe: { contains: filters.query, mode: 'insensitive' } },
        { nameEn: { contains: filters.query, mode: 'insensitive' } },
        { descriptionHe: { contains: filters.query, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: filters.query, mode: 'insensitive' } } } },
      ],
    });
  }

  if (filters.families.length > 0) {
    and.push({ fragranceFamily: { slug: { in: filters.families } } });
  }

  if (filters.collections.length > 0) {
    and.push({ collections: { some: { collection: { slug: { in: filters.collections } } } } });
  }

  if (filters.newArrivalsOnly) and.push({ isNewArrival: true });

  const variantConditions: Prisma.ProductVariantWhereInput = { isActive: true };

  if (filters.concentrations.length > 0) {
    variantConditions.concentration = { in: filters.concentrations as Concentration[] };
  }
  if (filters.volumes.length > 0) variantConditions.volumeMl = { in: filters.volumes };
  if (filters.minPriceAgorot !== null || filters.maxPriceAgorot !== null) {
    variantConditions.priceAgorot = {
      ...(filters.minPriceAgorot !== null ? { gte: filters.minPriceAgorot } : {}),
      ...(filters.maxPriceAgorot !== null ? { lte: filters.maxPriceAgorot } : {}),
    };
  }
  if (filters.onSaleOnly) variantConditions.compareAtAgorot = { not: null };

  and.push({ variants: { some: variantConditions } });

  if (filters.inStockOnly) {
    and.push({
      variants: {
        some: {
          isActive: true,
          inventoryItem: { is: { quantityOnHand: { gt: 0 } } },
        },
      },
    });
  }

  return { AND: and };
}

function buildOrderBy(sort: SortValue): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
    case 'price-asc':
      return [{ variants: { _count: 'desc' } }, { createdAt: 'asc' }];
    case 'price-desc':
      return [{ variants: { _count: 'desc' } }, { createdAt: 'desc' }];
    case 'bestsellers':
      // Real ranking is applied after projection, from actual order quantities.
      return [{ createdAt: 'asc' }];
    case 'recommended':
    default:
      return [{ isFeatured: 'desc' }, { createdAt: 'asc' }];
  }
}

export type ShopResult = {
  products: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
};

/** Units actually sold per variant, from orders that were not cancelled. */
async function soldQuantitiesByVariant(): Promise<Map<string, number>> {
  const rows = await db.orderItem.groupBy({
    by: ['variantId'],
    _sum: { quantity: true },
    where: {
      variantId: { not: null },
      order: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
    },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.variantId) map.set(row.variantId, row._sum.quantity ?? 0);
  }
  return map;
}

export async function searchProducts(filters: ShopFilters): Promise<ShopResult> {
  const where = buildWhere(filters);

  // Price and bestseller ordering depend on values that live on the variant or
  // in order history, so those two sorts are resolved after projection and
  // paginated in memory. Every other sort is paginated in SQL.
  const sortsInMemory =
    filters.sort === 'price-asc' ||
    filters.sort === 'price-desc' ||
    filters.sort === 'bestsellers';

  // Count first so we can clamp an out-of-range page (e.g. ?page=2 when the
  // whole catalogue fits on one page) to the last valid page instead of
  // rendering an empty results grid.
  const total = await db.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);

  const rows = await db.product.findMany({
    where,
    select: cardSelect,
    orderBy: buildOrderBy(filters.sort),
    ...(sortsInMemory ? {} : { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  });

  let products = rows.map(toCard).filter((card): card is ProductCard => card !== null);

  if (filters.sort === 'price-asc' || filters.sort === 'price-desc') {
    products.sort((a, b) =>
      filters.sort === 'price-asc'
        ? a.priceAgorot - b.priceAgorot
        : b.priceAgorot - a.priceAgorot,
    );
  } else if (filters.sort === 'bestsellers') {
    const sold = await soldQuantitiesByVariant();
    products.sort((a, b) => (sold.get(b.variantId) ?? 0) - (sold.get(a.variantId) ?? 0));
  }

  if (sortsInMemory) {
    const start = (page - 1) * PAGE_SIZE;
    products = products.slice(start, start + PAGE_SIZE);
  }

  return {
    products,
    total,
    page,
    pageCount,
  };
}

/** Facet values available for the filter UI, with live product counts. */
export async function getShopFacets() {
  const [families, collections, variants] = await Promise.all([
    db.fragranceFamily.findMany({
      orderBy: { position: 'asc' },
      select: {
        slug: true,
        nameHe: true,
        _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
      },
    }),
    db.collection.findMany({
      where: { isPublished: true },
      orderBy: { position: 'asc' },
      select: { slug: true, nameHe: true, _count: { select: { products: true } } },
    }),
    db.productVariant.findMany({
      where: { isActive: true, product: { status: 'PUBLISHED' } },
      select: { volumeMl: true, concentration: true, priceAgorot: true },
    }),
  ]);

  const volumes = [...new Set(variants.map((v) => v.volumeMl).filter((v): v is number => v !== null))].sort(
    (a, b) => a - b,
  );
  const concentrations = [...new Set(variants.map((v) => v.concentration))].filter(
    (c) => c !== 'UNSPECIFIED',
  );
  const prices = variants.map((v) => v.priceAgorot);

  return {
    families,
    collections,
    volumes,
    concentrations,
    minPriceAgorot: prices.length > 0 ? Math.min(...prices) : 0,
    maxPriceAgorot: prices.length > 0 ? Math.max(...prices) : 0,
  };
}
