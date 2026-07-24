import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product-form';

export const metadata: Metadata = { title: 'מוצר חדש' };

export default async function NewProductPage() {
  await requireCapability('products.write');

  const [categories, families] = await Promise.all([
    db.category.findMany({ orderBy: { position: 'asc' }, select: { id: true, nameHe: true } }),
    db.fragranceFamily.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, nameHe: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        titleHe="מוצר חדש"
        descriptionHe="מוצר חדש נוצר עם וריאנט ברירת מחדל אחד ורשומת מלאי. ניתן להוסיף וריאנטים נוספים לאחר השמירה."
      />
      <ProductForm
        mode="create"
        categories={categories}
        families={families}
        values={{
          slug: '',
          nameHe: '',
          nameEn: '',
          descriptionHe: '',
          storyHe: '',
          usageHe: '',
          ingredientsHe: '',
          status: 'DRAFT',
          categoryId: categories[0]?.id ?? '',
          fragranceFamilyId: '',
          seoTitleHe: '',
          seoDescriptionHe: '',
          isFeatured: false,
          isNewArrival: false,
          notesVerified: false,
          pricingVerified: false,
          sku: '',
          priceShekels: '',
          compareAtShekels: '',
          volumeMl: '',
          concentration: 'UNSPECIFIED',
          quantityOnHand: '0',
          lowStockThreshold: '5',
        }}
      />
    </div>
  );
}
