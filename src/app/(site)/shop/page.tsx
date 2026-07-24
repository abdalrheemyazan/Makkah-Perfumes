import type { Metadata } from 'next';
import Link from 'next/link';
import { getShopFacets, PAGE_SIZE, parseShopFilters, searchProducts } from '@/lib/shop-query';
import { ProductCard } from '@/components/product/product-card';
import { ShopFilterPanel } from '@/components/shop/filter-panel';
import { ActiveFilterChips } from '@/components/shop/active-filters';
import { SortSelect } from '@/components/shop/sort-select';
import { SORT_OPTIONS } from '@/lib/site';

export const metadata: Metadata = {
  title: 'בשמים',
  description: 'כל הבשמים, הלבונה והקטורת של מכה פרפיומס.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = parseShopFilters(params);

  const [result, facets] = await Promise.all([searchProducts(filters), getShopFacets()]);

  const from = (result.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(result.page * PAGE_SIZE, result.total);

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
          <li aria-current="page" className="text-cream">
            בשמים
          </li>
        </ol>
      </nav>

      <header className="mt-6">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">בשמים</h1>
        <p className="mt-3 text-sm text-muted">
          {result.total > 0 ? (
            <>
              מציג <span className="ltr-nums">{from}</span>–<span className="ltr-nums">{to}</span>{' '}
              מתוך <span className="ltr-nums">{result.total}</span> מוצרים
            </>
          ) : (
            'לא נמצאו מוצרים'
          )}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <ShopFilterPanel facets={facets} filters={filters} />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <ActiveFilterChips filters={filters} facets={facets} />
            <SortSelect current={filters.sort} options={SORT_OPTIONS} />
          </div>

          {result.products.length > 0 ? (
            <>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3">
                {result.products.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 3} />
                ))}
              </div>

              <Pagination page={result.page} pageCount={result.pageCount} params={params} />
            </>
          ) : (
            <div className="mt-12 rounded-sm border border-gold/15 bg-charcoal p-10 text-center">
              <h2 className="font-serif text-2xl text-ivory">לא נמצאו מוצרים</h2>
              <p className="mt-3 text-sm text-muted">
                נסו להסיר חלק מהמסננים או לחפש מונח אחר.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-block rounded-sm border border-gold/40 px-5 py-2.5 text-sm text-cream hover:border-gold hover:text-ivory"
              >
                ניקוי כל המסננים
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | string[] | undefined>;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === 'page' || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
      else next.set(key, value);
    }
    if (target > 1) next.set('page', String(target));
    const query = next.toString();
    return query ? `/shop?${query}` : '/shop';
  };

  return (
    <nav aria-label="ניווט בין עמודים" className="mt-14 flex items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          rel="prev"
          className="rounded-sm border border-gold/30 px-4 py-2 text-sm text-cream hover:border-gold"
        >
          הקודם
        </Link>
      )}

      <ul className="flex items-center gap-1">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <li key={number}>
            <Link
              href={hrefFor(number)}
              aria-current={number === page ? 'page' : undefined}
              className={
                number === page
                  ? 'ltr-nums grid h-9 w-9 place-items-center rounded-sm bg-gold text-sm font-medium text-ink'
                  : 'ltr-nums grid h-9 w-9 place-items-center rounded-sm border border-gold/20 text-sm text-cream hover:border-gold'
              }
            >
              {number}
            </Link>
          </li>
        ))}
      </ul>

      {page < pageCount && (
        <Link
          href={hrefFor(page + 1)}
          rel="next"
          className="rounded-sm border border-gold/30 px-4 py-2 text-sm text-cream hover:border-gold"
        >
          הבא
        </Link>
      )}
    </nav>
  );
}
