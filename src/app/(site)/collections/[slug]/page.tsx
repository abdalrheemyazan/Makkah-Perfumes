import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import { PageIdentity } from '@/components/layout/page-identity';
import { ButtonLink } from '@/components/ui/button';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await db.collection.findUnique({
    where: { slug },
    select: { nameHe: true, descriptionHe: true },
  });
  if (!collection) return { title: 'הקולקציה לא נמצאה' };
  return {
    title: collection.nameHe,
    description: collection.descriptionHe ?? undefined,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;

  const collection = await db.collection.findFirst({
    where: { slug, isPublished: true },
    include: {
      products: {
        orderBy: { position: 'asc' },
        include: { product: { select: cardSelect } },
      },
    },
  });

  if (!collection) notFound();

  const products = collection.products
    .map((entry) => toCard(entry.product))
    .filter((card): card is ProductCardData => card !== null);

  return (
    <>
      <PageIdentity
        titleHe={collection.nameHe}
        breadcrumb={[
          { labelHe: 'בית', href: '/' },
          { labelHe: 'קולקציות', href: '/collections' },
          { labelHe: collection.nameHe },
        ]}
        descriptionHe={collection.descriptionHe ?? undefined}
      />
      <div className="container-editorial pt-10 pb-24">
        {products.length === 0 ? (
          <div className="rounded-lg border border-gold/15 bg-charcoal p-10 text-center">
            <p className="text-base font-semibold text-ivory">אין כרגע מוצרים בקולקציה זו</p>
            <div className="mt-6">
              <ButtonLink href="/shop">לכל הבשמים</ButtonLink>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
