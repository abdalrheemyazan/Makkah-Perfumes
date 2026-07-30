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
import { RestockNotify } from '@/components/product/restock-notify';
import { ProductCard } from '@/components/product/product-card';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { getCurrentUser } from '@/lib/auth';
import { availableChannels, publicVapidKey } from '@/lib/notifications/env';
import { findActiveSubscription } from '@/lib/notifications/restock';
import { FRAGRANCE_CONTENT_BY_SLUG, type FragranceSourceNote } from '@/lib/fragrance-content';

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

  const sourceContent = FRAGRANCE_CONTENT_BY_SLUG.get(slug);

  return {
    title: product.nameHe,
    description: sourceContent?.descriptionHe ?? product.seoDescriptionHe ?? product.descriptionHe ?? SITE.descriptionHe,
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

  // Restock-notification context (only meaningful when out of stock).
  const restockChannels = availableChannels();
  const restockVapidKey = publicVapidKey();
  const alreadySubscribed =
    !inStock && user && variant
      ? await findActiveSubscription({
          productId: product.id,
          variantId: variant.id,
          userId: user.id,
          email: null,
        })
      : false;

  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
  const sourceContent = FRAGRANCE_CONTENT_BY_SLUG.get(product.slug);
  const descriptionHe = sourceContent?.descriptionHe ?? product.descriptionHe;

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
                {inStock ? (
                  <AddToCartButton variantId={variant.id} size="lg" />
                ) : (
                  <RestockNotify
                    productId={product.id}
                    variantId={variant.id}
                    isLoggedIn={Boolean(user)}
                    accountEmail={user?.email ?? null}
                    emailAvailable={restockChannels.email}
                    vapidPublicKey={restockVapidKey}
                    alreadySubscribed={alreadySubscribed}
                  />
                )}
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

          <div className="mt-8 flex flex-col gap-2 text-xs text-faint">
            <p>פרטי המסירה והזמינות יאושרו לאחר קבלת ההזמנה.</p>
            <Link href="/shipping-and-returns" className="underline underline-offset-2 hover:text-cream">
              מדיניות משלוחים והחזרות
            </Link>
          </div>
        </div>
      </div>

      {sourceContent && descriptionHe && (
        <FragranceProfile
          descriptionHe={descriptionHe}
          familyHe={sourceContent.family.nameHe}
          launchYear={sourceContent.launchYear}
          perfumers={sourceContent.perfumers}
          noteStructure={sourceContent.noteStructure}
          notes={sourceContent.notes}
        />
      )}

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
        descriptionHe={descriptionHe}
      />
    </div>
  );
}

function FragranceProfile({
  descriptionHe,
  familyHe,
  launchYear,
  perfumers,
  noteStructure,
  notes,
}: {
  descriptionHe: string;
  familyHe: string;
  launchYear: number;
  perfumers: readonly string[];
  noteStructure: 'PYRAMID' | 'KEY';
  notes: readonly FragranceSourceNote[];
}) {
  const top = notes.filter((note) => note.tier === 'TOP');
  const heart = notes.filter((note) => note.tier === 'HEART');
  const base = notes.filter((note) => note.tier === 'BASE');

  return (
    <section aria-labelledby="fragrance-profile-heading" className="mt-24 border-y border-gold/15 py-14">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-20">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-gold">פרופיל הניחוח</p>
          <h2 id="fragrance-profile-heading" className="mt-3 text-3xl text-ivory">הקומפוזיציה</h2>
          <p className="mt-5 text-base leading-[1.9] text-cream/80">{descriptionHe}</p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-gold/15 pt-6 text-sm">
            <div>
              <dt className="text-faint">משפחת ניחוח</dt>
              <dd className="mt-1 text-cream">{familyHe}</dd>
            </div>
            <div>
              <dt className="text-faint">שנת השקה</dt>
              <dd className="ltr-nums mt-1 text-cream">{launchYear}</dd>
            </div>
            {perfumers.length > 0 && (
              <div className="col-span-2">
                <dt className="text-faint">הבשמים</dt>
                <dd className="mt-1 text-cream" dir="ltr" lang="en">{perfumers.join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {noteStructure === 'KEY' ? (
          <div>
            <h3 className="text-lg text-ivory">תווי מפתח</h3>
            <NoteChips notes={notes} />
          </div>
        ) : (
          <div className="grid gap-px overflow-hidden rounded-sm border border-gold/15 bg-gold/15 md:grid-cols-3">
            <NoteColumn titleHe="תווי פתיחה" notes={top} />
            <NoteColumn titleHe="תווי לב" notes={heart} />
            <NoteColumn titleHe="תווי בסיס" notes={base} />
          </div>
        )}
      </div>
    </section>
  );
}

function NoteColumn({
  titleHe,
  notes,
}: {
  titleHe: string;
  notes: readonly FragranceSourceNote[];
}) {
  if (notes.length === 0) return null;
  return (
    <div className="bg-ink-raised p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-gold">{titleHe}</h3>
      <NoteChips notes={notes} />
    </div>
  );
}

function NoteChips({ notes }: { notes: readonly FragranceSourceNote[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {notes.map((note) => (
        <li key={`${note.tier}-${note.slug}`} className="rounded-full border border-gold/20 bg-charcoal/65 px-3 py-2">
          <span className="text-sm text-cream">{note.nameHe}</span>
          <span className="ms-1.5 text-[0.68rem] text-faint" dir="ltr" lang="en">{note.nameEn}</span>
        </li>
      ))}
    </ul>
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
  descriptionHe,
}: {
  product: { nameHe: string; nameEn: string; slug: string; descriptionHe: string | null; pricingVerified: boolean };
  priceAgorot: number | null;
  inStock: boolean;
  imageUrl: string | null;
  descriptionHe: string | null;
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nameEn,
    alternateName: product.nameHe,
    brand: { '@type': 'Brand', name: SITE.nameEn },
    url: `${SITE.url}/shop/${product.slug}`,
  };

  if (descriptionHe) data.description = descriptionHe;
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
