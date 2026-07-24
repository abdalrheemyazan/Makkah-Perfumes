import type { Metadata } from 'next';
import { parseShopFilters, searchProducts } from '@/lib/shop-query';
import { ProductCard } from '@/components/product/product-card';
import { SearchBox } from '@/components/shop/search-box';

export const metadata: Metadata = {
  title: 'חיפוש',
  robots: { index: false, follow: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = parseShopFilters(params);

  // No query yet: show the box, not an empty grid pretending to be a result.
  const result = filters.query ? await searchProducts(filters) : null;

  return (
    <div className="container-editorial pt-32 pb-24">
      <h1 className="font-serif text-4xl text-ivory">חיפוש</h1>

      <div className="mt-6 max-w-xl">
        <SearchBox defaultValue={filters.query ?? ''} />
      </div>

      {result === null ? (
        <p className="mt-10 text-sm text-muted">הקלידו שם בושם, משפחת ניחוח או מק״ט.</p>
      ) : result.products.length === 0 ? (
        <div className="mt-10 rounded-sm border border-gold/15 bg-charcoal p-10">
          <p className="font-serif text-xl text-ivory">
            לא נמצאו תוצאות עבור „{filters.query}”
          </p>
          <p className="mt-2 text-sm text-muted">
            בדקו את האיות או נסו מונח כללי יותר, למשל „עוד” או „לבונה”.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            <span className="ltr-nums">{result.total}</span> תוצאות עבור „{filters.query}”
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {result.products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
