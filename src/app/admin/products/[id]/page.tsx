import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { agorotToShekels } from '@/lib/commerce/money';
import { PRODUCT_STATUS_LABELS } from '@/lib/admin/labels';
import { PageHeader, Card, Badge } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product-form';
import { ProductStatusActions } from '@/components/admin/product-status-actions';

export const metadata: Metadata = { title: 'עריכת מוצר' };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ created?: string; duplicated?: string }>;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireCapability('products.write');
  const { id } = await params;
  const { created, duplicated } = await searchParams;

  const [product, categories, families] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: {
          where: { isDefault: true },
          take: 1,
          include: { inventoryItem: true },
        },
      },
    }),
    db.category.findMany({ orderBy: { position: 'asc' }, select: { id: true, nameHe: true } }),
    db.fragranceFamily.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, nameHe: true },
    }),
  ]);

  if (!product) notFound();

  const variant = product.variants[0];
  const inventory = variant?.inventoryItem;

  return (
    <div>
      <PageHeader
        titleHe={product.nameHe}
        descriptionHe={product.nameEn}
        action={
          <div className="flex flex-wrap items-center gap-3">
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
            {product.status === 'PUBLISHED' && (
              <Link
                href={`/shop/${product.slug}`}
                className="text-sm text-gold hover:text-cream"
                target="_blank"
                rel="noreferrer"
              >
                צפייה באתר ↗
              </Link>
            )}
          </div>
        }
      />

      {(created || duplicated) && (
        <p
          role="status"
          className="mt-6 rounded-sm border border-success/40 bg-success/10 p-3 text-sm text-success"
        >
          {created ? 'המוצר נוצר בהצלחה.' : 'המוצר שוכפל כטיוטה. עדכנו מק״ט ומחיר לפני פרסום.'}
        </p>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_18rem] xl:items-start">
        <div className="order-2 xl:order-1">
          <ProductForm
            mode="edit"
            categories={categories}
            families={families}
            stockLocked
            values={{
              id: product.id,
              slug: product.slug,
              nameHe: product.nameHe,
              nameEn: product.nameEn,
              descriptionHe: product.descriptionHe ?? '',
              storyHe: product.storyHe ?? '',
              usageHe: product.usageHe ?? '',
              ingredientsHe: product.ingredientsHe ?? '',
              status: product.status,
              categoryId: product.categoryId ?? '',
              fragranceFamilyId: product.fragranceFamilyId ?? '',
              seoTitleHe: product.seoTitleHe ?? '',
              seoDescriptionHe: product.seoDescriptionHe ?? '',
              isFeatured: product.isFeatured,
              isNewArrival: product.isNewArrival,
              notesVerified: product.notesVerified,
              pricingVerified: product.pricingVerified,
              sku: variant?.sku ?? '',
              priceShekels: variant ? String(agorotToShekels(variant.priceAgorot)) : '',
              compareAtShekels: variant?.compareAtAgorot
                ? String(agorotToShekels(variant.compareAtAgorot))
                : '',
              volumeMl: variant?.volumeMl ? String(variant.volumeMl) : '',
              concentration: variant?.concentration ?? 'UNSPECIFIED',
              quantityOnHand: String(inventory?.quantityOnHand ?? 0),
              lowStockThreshold: String(inventory?.lowStockThreshold ?? 5),
            }}
          />
        </div>

        <aside className="order-1 flex flex-col gap-6 xl:order-2">
          <Card titleHe="תמונות">
            {product.images.length === 0 ? (
              <p className="text-sm text-muted">אין תמונות למוצר.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 xl:grid-cols-2">
                {product.images.map((image) => (
                  <li
                    key={image.id}
                    className="relative aspect-square overflow-hidden rounded-sm border border-gold/15 bg-ink"
                  >
                    <Image
                      src={image.url}
                      alt={image.altHe}
                      fill
                      sizes="120px"
                      className="object-contain p-1.5"
                    />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-faint">
              העלאת תמונות מתבצעת דרך מסך המדיה.
            </p>
          </Card>

          <Card titleHe="מלאי">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">במלאי</dt>
                <dd className="ltr-nums text-cream">{inventory?.quantityOnHand ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">משוריין</dt>
                <dd className="ltr-nums text-cream">{inventory?.quantityReserved ?? 0}</dd>
              </div>
            </dl>
            <Link
              href="/admin/inventory"
              className="mt-4 inline-block text-sm text-gold hover:text-cream"
            >
              לניהול המלאי →
            </Link>
          </Card>

          <Card titleHe="פעולות">
            <ProductStatusActions productId={product.id} status={product.status} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
