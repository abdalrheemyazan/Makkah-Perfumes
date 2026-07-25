import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { SITE } from '@/lib/site';
import { CONCENTRATION_LABELS } from '@/lib/commerce/labels';
import { Price } from '@/components/ui/price';
import { AddToCartButton } from '@/components/product/add-to-cart-button';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ProductCard } from '@/components/product/product-card';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { getCurrentUser } from '@/lib/auth';

type Params = Promise<{ slug: string }>;

async function loadProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      images: { orderBy: { position: 'asc' } },
      media: { orderBy: { position: 'asc' } },
      models: { where: { isApproved: true } },
      category: true,
      fragranceFamily: true,
      variants: {
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
        include: { inventoryItem: true },
      },
      notes: { include: { note: true }, orderBy: { position: 'asc' } },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true } } },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { nameHe: true, nameEn: true, seoTitleHe: true, seoDescriptionHe: true, descriptionHe: true },
  });

  if (!product) return { title: 'המוצר לא נמצא' };

  return {
    title: product.nameHe,
    description: product.seoDescriptionHe ?? product.descriptionHe ?? SITE.descriptionHe,
    alternates: { canonical: `${SITE.url}/shop/${slug}` },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const savedProductIds = user
    ? (
        await db.wishlistItem.findMany({
          where: { wishlist: { userId: user.id }, productId: product.id },
          select: { productId: true },
        })
      ).map((item) => item.productId)
    : [];

  const variant = product.variants[0];
  const inventory = variant?.inventoryItem;
  const available = inventory
    ? Math.max(0, inventory.quantityOnHand - inventory.quantityReserved)
    : 0;
  const inStock = available > 0 || (inventory?.allowBackorder ?? false);

  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];

  // The pyramid is only rendered once the notes have been verified with the
  // brand. We do not invent fragrance notes — see docs/MISSING_BUSINESS_DATA.md.
  const showPyramid = product.notesVerified && product.notes.length > 0;
  const topNotes = product.notes.filter((entry) => entry.tier === 'TOP');
  const heartNotes = product.notes.filter((entry) => entry.tier === 'HEART');
  const baseNotes = product.notes.filter((entry) => entry.tier === 'BASE');

  const related = await loadRelated(product.id, product.fragranceFamilyId);

  return (
    <div className="container-editorial pt-32 pb-24">
      <Breadcrumbs productNameHe={product.nameHe} />

      <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div>
          <div className="relative aspect-3/4 overflow-hidden rounded-sm border border-gold/15 bg-charcoal">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.altHe}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-contain p-10"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-faint">אין תמונה</div>
            )}
          </div>

          {product.images.length > 1 && (
            <ul className="mt-4 grid grid-cols-4 gap-3">
              {product.images.map((image) => (
                <li key={image.id} className="relative aspect-square overflow-hidden rounded-sm border border-gold/15 bg-charcoal">
                  <Image src={image.url} alt={image.altHe} fill sizes="20vw" className="object-contain p-2" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buy box */}
        <div>
          {product.fragranceFamily && (
            <Link
              href={`/shop?family=${product.fragranceFamily.slug}`}
              className="text-sm tracking-[0.15em] text-gold hover:text-cream"
            >
              {product.fragranceFamily.nameHe}
            </Link>
          )}

          <h1 className="mt-3 font-serif text-4xl text-ivory sm:text-5xl">{product.nameHe}</h1>
          <p className="mt-2 text-base tracking-wide text-muted" dir="ltr" lang="en">
            {product.nameEn}
          </p>

          <div className="mt-6">
            {variant && (
              <Price
                agorot={variant.priceAgorot}
                compareAtAgorot={variant.compareAtAgorot}
                verified={product.pricingVerified}
                size="lg"
              />
            )}
          </div>

          {/* Stock */}
          <p className="mt-4 flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`inline-block h-2 w-2 rounded-full ${inStock ? 'bg-success' : 'bg-danger'}`}
            />
            <span className={inStock ? 'text-success' : 'text-danger'}>
              {inStock
                ? available > 0 && available <= 5
                  ? `נותרו ${available} יחידות במלאי`
                  : 'במלאי'
                : 'אזל מהמלאי'}
            </span>
          </p>

          {variant && (
            <dl className="mt-6 grid grid-cols-2 gap-y-3 border-y border-gold/15 py-5 text-sm">
              {variant.volumeMl && (
                <>
                  <dt className="text-muted">נפח</dt>
                  <dd className="ltr-nums text-cream">{variant.volumeMl} מ״ל</dd>
                </>
              )}
              {variant.concentration !== 'UNSPECIFIED' && (
                <>
                  <dt className="text-muted">ריכוז</dt>
                  <dd className="text-cream">{CONCENTRATION_LABELS[variant.concentration]}</dd>
                </>
              )}
              <dt className="text-muted">מק״ט</dt>
              <dd className="ltr-nums text-cream" dir="ltr">
                {variant.sku}
              </dd>
            </dl>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-stretch gap-3">
            {variant && (
              <div className="flex-1">
                <AddToCartButton variantId={variant.id} disabled={!inStock} size="lg" />
              </div>
            )}
            <div className="shrink-0 self-start pt-0.5">
              <WishlistButton
                productId={product.id}
                productNameHe={product.nameHe}
                initiallySaved={savedProductIds.includes(product.id)}
              />
            </div>
          </div>

          {product.descriptionHe && (
            <div className="mt-10">
              <h2 className="font-serif text-xl text-ivory">על הבושם</h2>
              <p className="mt-3 text-sm leading-relaxed text-cream/80">{product.descriptionHe}</p>
            </div>
          )}

          {/* Fragrance pyramid — verified notes only */}
          {showPyramid ? (
            <div className="mt-10">
              <h2 className="font-serif text-xl text-ivory">פירמידת הניחוח</h2>
              <dl className="mt-4 flex flex-col gap-4">
                <NoteTier titleHe="תווי פתיחה" notes={topNotes} />
                <NoteTier titleHe="תווי לב" notes={heartNotes} />
                <NoteTier titleHe="תווי בסיס" notes={baseNotes} />
              </dl>
            </div>
          ) : (
            <p className="mt-10 rounded-sm border border-gold/15 bg-charcoal p-4 text-xs leading-relaxed text-muted">
              פירמידת הניחוח הרשמית של המוצר טרם התקבלה מהמותג ולכן אינה מוצגת.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2 text-xs text-faint">
            <p>זמני האספקה יימסרו בעת אישור ההזמנה.</p>
            <Link href="/shipping-and-returns" className="underline underline-offset-2 hover:text-cream">
              מדיניות משלוחים והחזרות
            </Link>
          </div>
        </div>
      </div>

      {/* Reviews — approved only, never fabricated */}
      <section aria-labelledby="reviews-heading" className="mt-24 border-t border-gold/15 pt-12">
        <h2 id="reviews-heading" className="font-serif text-2xl text-ivory">
          ביקורות לקוחות
        </h2>
        {product.reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted">עדיין אין ביקורות למוצר זה.</p>
        ) : (
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {product.reviews.map((review) => (
              <li key={review.id} className="rounded-sm border border-gold/15 bg-charcoal p-6">
                <p className="ltr-nums text-gold" aria-label={`דירוג ${review.rating} מתוך 5`}>
                  {'★'.repeat(review.rating)}
                </p>
                {review.titleHe && <h3 className="mt-2 font-serif text-lg text-ivory">{review.titleHe}</h3>}
                <p className="mt-2 text-sm leading-relaxed text-cream/80">{review.bodyHe}</p>
                <p className="mt-3 text-xs text-faint">
                  {review.user?.firstName ?? 'לקוח/ה'}
                  {review.orderId && (
                    <span className="ms-2 rounded-sm border border-success/40 px-1.5 py-0.5 text-success">
                      רכישה מאומתת
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-24 border-t border-gold/15 pt-12">
          <h2 id="related-heading" className="font-serif text-2xl text-ivory">
            מוצרים דומים
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      <ProductJsonLd
        product={product}
        priceAgorot={variant?.priceAgorot ?? null}
        inStock={inStock}
        imageUrl={primaryImage?.url ?? null}
      />
    </div>
  );
}

function NoteTier({
  titleHe,
  notes,
}: {
  titleHe: string;
  notes: { note: { nameHe: string } }[];
}) {
  if (notes.length === 0) return null;
  return (
    <div>
      <dt className="text-sm text-gold">{titleHe}</dt>
      <dd className="mt-1 text-sm text-cream/85">
        {notes.map((entry) => entry.note.nameHe).join(' · ')}
      </dd>
    </div>
  );
}

function Breadcrumbs({ productNameHe }: { productNameHe: string }) {
  return (
    <nav aria-label="מסלול ניווט" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-ivory">
            בית
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/shop" className="hover:text-ivory">
            בשמים
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-cream">
          {productNameHe}
        </li>
      </ol>
    </nav>
  );
}

async function loadRelated(productId: string, familyId: string | null): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: productId },
      ...(familyId ? { fragranceFamilyId: familyId } : {}),
    },
    select: cardSelect,
    take: 4,
  });

  const cards = rows.map(toCard).filter((card): card is ProductCardData => card !== null);
  if (cards.length > 0) return cards;

  // Fall back to any other published product so the section is never a dead end.
  const fallback = await db.product.findMany({
    where: { status: 'PUBLISHED', id: { not: productId } },
    select: cardSelect,
    take: 4,
  });
  return fallback.map(toCard).filter((card): card is ProductCardData => card !== null);
}

/**
 * Product structured data.
 *
 * Price and availability are only emitted when the pricing has been verified.
 * Publishing an unverified price as machine-readable fact would misinform
 * shopping surfaces, so unverified products get identity fields only.
 * `aggregateRating` is never emitted — there are no real reviews yet.
 */
function ProductJsonLd({
  product,
  priceAgorot,
  inStock,
  imageUrl,
}: {
  product: { nameHe: string; nameEn: string; slug: string; descriptionHe: string | null; pricingVerified: boolean };
  priceAgorot: number | null;
  inStock: boolean;
  imageUrl: string | null;
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nameEn,
    alternateName: product.nameHe,
    brand: { '@type': 'Brand', name: SITE.nameEn },
    url: `${SITE.url}/shop/${product.slug}`,
  };

  if (product.descriptionHe) data.description = product.descriptionHe;
  if (imageUrl) data.image = `${SITE.url}${imageUrl}`;

  if (product.pricingVerified && priceAgorot !== null) {
    data.offers = {
      '@type': 'Offer',
      priceCurrency: 'ILS',
      price: (priceAgorot / 100).toFixed(2),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE.url}/shop/${product.slug}`,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
