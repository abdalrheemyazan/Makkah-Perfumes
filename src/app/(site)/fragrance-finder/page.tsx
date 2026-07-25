import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { PageIdentity } from '@/components/layout/page-identity';
import { FragranceConsultation } from '@/components/fragrance/fragrance-consultation';

export const metadata: Metadata = {
  title: 'התאמת ניחוח',
  description: 'ייעוץ ניחוח מודרך: כמה שאלות קצרות ונמצא עבורכם בושם מתוך הקטלוג.',
  alternates: { canonical: '/fragrance-finder' },
};

/**
 * The consultation itself is a client experience (one question at a time), but
 * the matching remains the project's deterministic engine and the products are
 * fetched here on the server — so recommendations use real catalogue data and
 * add-to-cart / wishlist behave exactly as elsewhere.
 */
export default async function FragranceFinderPage() {
  const rows = await db.product.findMany({
    where: { status: 'PUBLISHED' },
    select: { ...cardSelect, fragranceFamily: { select: { nameHe: true, slug: true } } },
  });
  const products = rows
    .map(toCard)
    .filter((card): card is ProductCardData => card !== null);

  return (
    <>
      <PageIdentity
        titleHe="התאמת ניחוח"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'התאמת ניחוח' }]}
      />
      <FragranceConsultation products={products} totalPublished={products.length} />

      <noscript>
        <div className="container-editorial pb-20 text-center">
          <p className="text-sm text-cream/80">
            שאלון ההתאמה דורש JavaScript. אפשר לעיין בינתיים בכל הבשמים.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-flex h-11 items-center rounded-sm bg-gold px-6 text-sm font-medium text-ink"
          >
            לכל הבשמים
          </Link>
        </div>
      </noscript>
    </>
  );
}
