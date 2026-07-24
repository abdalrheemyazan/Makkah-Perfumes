import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { PRODUCT_STATUS_LABELS } from '@/lib/admin/labels';
import {
  AdminButtonLink,
  Badge,
  Cell,
  EmptyState,
  PageHeader,
  Row,
  Table,
} from '@/components/admin/ui';

export const metadata: Metadata = { title: 'מוצרים' };

type SearchParams = Promise<{ q?: string; status?: string }>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability('products.write');
  const { q, status } = await searchParams;

  const products = await db.product.findMany({
    where: {
      ...(status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)
        ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }
        : {}),
      ...(q
        ? {
            OR: [
              { nameHe: { contains: q, mode: 'insensitive' as const } },
              { nameEn: { contains: q, mode: 'insensitive' as const } },
              { variants: { some: { sku: { contains: q, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      fragranceFamily: { select: { nameHe: true } },
      variants: {
        where: { isDefault: true },
        take: 1,
        include: { inventoryItem: true },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });

  return (
    <div>
      <PageHeader
        titleHe="מוצרים"
        descriptionHe={`${products.length} מוצרים בקטלוג`}
        action={<AdminButtonLink href="/admin/products/new">מוצר חדש</AdminButtonLink>}
      />

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs text-muted">
            חיפוש
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="שם או מק״ט"
            className="mt-1 h-10 rounded-sm border border-gold/25 bg-ink px-3 text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs text-muted">
            סטטוס
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="mt-1 h-10 rounded-sm border border-gold/25 bg-ink px-3 text-sm text-cream focus:border-gold focus:outline-none"
          >
            <option value="">הכול</option>
            {Object.entries(PRODUCT_STATUS_LABELS).map(([value, labelHe]) => (
              <option key={value} value={value}>
                {labelHe}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-sm border border-gold/40 px-4 text-sm text-cream hover:border-gold"
        >
          סינון
        </button>
        {(q || status) && (
          <Link href="/admin/products" className="text-sm text-muted hover:text-ivory">
            ניקוי
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="לא נמצאו מוצרים"
            descriptionHe={q || status ? 'נסו לשנות את הסינון.' : 'התחילו ביצירת המוצר הראשון.'}
            action={<AdminButtonLink href="/admin/products/new">מוצר חדש</AdminButtonLink>}
          />
        </div>
      ) : (
        <Table headers={['מוצר', 'מק״ט', 'מחיר', 'מלאי', 'סטטוס', '']}>
          {products.map((product) => {
            const variant = product.variants[0];
            const inventory = variant?.inventoryItem;
            const available = inventory
              ? inventory.quantityOnHand - inventory.quantityReserved
              : 0;
            const image = product.images[0];

            return (
              <Row key={product.id}>
                <Cell labelHe="מוצר">
                  <span className="flex items-center gap-3">
                    {image && (
                      <span className="relative hidden h-11 w-11 shrink-0 overflow-hidden rounded-sm border border-gold/15 bg-ink md:block">
                        <Image
                          src={image.url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                        />
                      </span>
                    )}
                    <span className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="block truncate text-ivory hover:text-gold"
                      >
                        {product.nameHe}
                      </Link>
                      <span className="block truncate text-xs text-faint" dir="ltr">
                        {product.nameEn}
                      </span>
                    </span>
                  </span>
                </Cell>
                <Cell labelHe="מק״ט">
                  <span className="ltr-nums text-xs" dir="ltr">
                    {variant?.sku ?? '—'}
                  </span>
                </Cell>
                <Cell labelHe="מחיר">
                  <span className="ltr-nums">
                    {variant ? formatPrice(variant.priceAgorot) : '—'}
                  </span>
                  {!product.pricingVerified && (
                    <span className="ms-2">
                      <Badge tone="warning">לא מאומת</Badge>
                    </span>
                  )}
                </Cell>
                <Cell labelHe="מלאי">
                  <Badge
                    tone={available <= 0 ? 'danger' : available <= (inventory?.lowStockThreshold ?? 5) ? 'warning' : 'neutral'}
                  >
                    <span className="ltr-nums">{available}</span>
                  </Badge>
                </Cell>
                <Cell labelHe="סטטוס">
                  <Badge
                    tone={
                      product.status === 'PUBLISHED'
                        ? 'success'
                        : product.status === 'DRAFT'
                          ? 'gold'
                          : 'neutral'
                    }
                  >
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </Badge>
                </Cell>
                <Cell>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-xs text-gold hover:text-cream"
                  >
                    עריכה
                  </Link>
                </Cell>
              </Row>
            );
          })}
        </Table>
      )}
    </div>
  );
}
