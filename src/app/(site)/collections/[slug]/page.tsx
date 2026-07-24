import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';

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
    <div className="container-editorial pt-32 pb-24">
      <nav aria-label="מסלול ניווט" className="text-xs text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-ivory">
              בית
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/collections" className="hover:text-ivory">
              קולקציות
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-cream">
            {collection.nameHe}
          </li>
        </ol>
      </nav>

      <h1 className="mt-6 font-serif text-4xl text-ivory sm:text-5xl">{collection.nameHe}</h1>
      {collection.descriptionHe && (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {collection.descriptionHe}
        </p>
      )}

      {products.length === 0 ? (
        <p className="mt-10 text-muted">אין כרגע מוצרים בקולקציה זו.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
