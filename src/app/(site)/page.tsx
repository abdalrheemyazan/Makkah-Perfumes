import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { getFeaturedProducts, getFragranceFamilies } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { ScrollCue } from '@/components/home/scroll-cue';
import { BrandStory } from '@/components/home/brand-story';

export default async function HomePage() {
  const [featured, families, heroBlock, storyBlock] = await Promise.all([
    getFeaturedProducts(6),
    getFragranceFamilies(),
    db.contentBlock.findUnique({ where: { key: 'home.hero' } }),
    db.contentBlock.findUnique({ where: { key: 'home.brand-story' } }),
  ]);

  const hero = featured[0] ?? null;

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-svh items-center overflow-hidden pt-18">
        {/* Lighting stage. Purely decorative — no information lives here. */}
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-ink" />
          <div
            className="absolute start-[-10%] top-1/2 h-[85vh] w-[85vh] -translate-y-1/2 rounded-full opacity-70 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--color-amber) 55%, transparent) 0%, transparent 65%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/3"
            style={{ background: 'linear-gradient(to top, var(--color-ink), transparent)' }}
          />
        </div>

        <div className="container-editorial relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-8">
          {/* Copy — first in DOM, so it lands on the right in RTL */}
          <div className="max-w-xl">
            <p className="text-sm tracking-[0.2em] text-gold uppercase">
              מורשת של בישום עומאני
            </p>

            <h1 className="mt-6 font-serif text-5xl leading-[1.08] text-ivory sm:text-6xl lg:text-7xl">
              {heroBlock?.titleHe ?? 'ניחוח שנשאר איתך'}
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-cream/85 sm:text-lg">
              {heroBlock?.bodyHe ??
                'בשמי יוקרה, לבונה וקטורת שנוצרו מתוך מסורת, חומרי גלם ואהבה לפרטים.'}
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/shop" size="lg">
                לגלות את הקולקציה
              </ButtonLink>
              <ButtonLink href="/fragrance-finder" variant="secondary" size="lg">
                למציאת הניחוח שלך
              </ButtonLink>
            </div>
          </div>

          {/* Hero product — the real packshot, unaltered */}
          {hero?.imageUrl && (
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="relative aspect-4/5">
                <Image
                  src={hero.imageUrl}
                  alt={hero.imageAltHe}
                  fill
                  priority
                  sizes="(max-width: 1024px) 80vw, 45vw"
                  className="object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,0.85)]"
                />
              </div>
              <p className="mt-4 text-center text-sm text-muted">
                <Link href={`/shop/${hero.slug}`} className="hover:text-ivory">
                  {hero.nameHe}
                  <span className="mx-2 text-faint" aria-hidden="true">
                    ·
                  </span>
                  <span dir="ltr" lang="en">
                    {hero.nameEn}
                  </span>
                </Link>
              </p>
            </div>
          )}
        </div>

        <ScrollCue />
      </section>

      {/* ================= FEATURED ================= */}
      <section aria-labelledby="featured-heading" className="container-editorial py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.2em] text-gold uppercase">הקולקציה</p>
            <h2 id="featured-heading" className="mt-3 font-serif text-4xl text-ivory sm:text-5xl">
              בשמים נבחרים
            </h2>
          </div>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 text-sm text-cream hover:text-gold"
          >
            לכל הבשמים
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 2} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-muted">הקטלוג יתעדכן בקרוב.</p>
        )}
      </section>

      {/* ================= SCENT FAMILIES ================= */}
      <section aria-labelledby="families-heading" className="border-y border-gold/10 bg-charcoal py-24">
        <div className="container-editorial">
          <p className="text-sm tracking-[0.2em] text-gold uppercase">משפחות ניחוח</p>
          <h2 id="families-heading" className="mt-3 max-w-xl font-serif text-4xl text-ivory sm:text-5xl">
            למצוא את השפה שמדברת אליכם
          </h2>

          <ul className="mt-12 grid gap-px overflow-hidden rounded-sm border border-gold/15 bg-gold/15 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((family) => (
              <li key={family.id}>
                <Link
                  href={`/shop?family=${family.slug}`}
                  className="group flex h-full flex-col justify-between bg-charcoal p-7 transition-colors duration-300 hover:bg-stone"
                >
                  <div>
                    <span
                      aria-hidden="true"
                      className="block h-8 w-8 rounded-full"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${
                          family.accentColor ?? '#B38A52'
                        }, transparent 70%)`,
                      }}
                    />
                    <h3 className="mt-5 font-serif text-2xl text-ivory">{family.nameHe}</h3>
                    {family.descriptionHe && (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {family.descriptionHe}
                      </p>
                    )}
                  </div>
                  <p className="mt-6 text-xs text-faint">
                    <span className="ltr-nums">{family._count.products}</span> בשמים
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= BRAND STORY ================= */}
      <BrandStory
        titleHe={storyBlock?.titleHe ?? 'מהמסורת העומאנית אל הניחוח המודרני'}
        bodyHe={storyBlock?.bodyHe ?? ''}
      />

      {/* ================= FRANKINCENSE ================= */}
      <section
        aria-labelledby="frankincense-heading"
        className="relative overflow-hidden border-y border-gold/10 bg-charcoal py-28"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-45"
          style={{
            background:
              'radial-gradient(ellipse at 75% 40%, color-mix(in oklab, var(--color-amber) 40%, transparent), transparent 60%)',
          }}
        />
        <div className="container-editorial relative max-w-2xl">
          <p className="text-sm tracking-[0.2em] text-gold uppercase">לבונה וקטורת</p>
          <h2 id="frankincense-heading" className="mt-3 font-serif text-4xl text-ivory sm:text-5xl">
            עולם הלבונה והקטורת
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream/85">
            שרף הלבונה נאסף מגזעי עצי בוסוואליה ומשמש בבישום מזה אלפי שנים.
            הוא עומד בבסיס שפת הריח של דרום ערב — עשן יבש, הדרי בפתיחה ושרפי בעומק.
          </p>
          <div className="mt-9">
            <ButtonLink href="/frankincense-and-incense" variant="secondary" size="lg">
              לגלות את עולם הלבונה והקטורת
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ================= FRAGRANCE FINDER ================= */}
      <section aria-labelledby="finder-heading" className="container-editorial py-24">
        <div className="grid gap-10 rounded-sm border border-gold/15 bg-charcoal p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-14">
          <div>
            <p className="text-sm tracking-[0.2em] text-gold uppercase">התאמה אישית</p>
            <h2 id="finder-heading" className="mt-3 font-serif text-4xl text-ivory">
              לא בטוחים איזה ניחוח מתאים לכם?
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-cream/85">
              ענו על חמש שאלות קצרות ונציע לכם בשמים מתוך הקטלוג — עם הסבר
              למה כל אחד מהם מתאים לכם.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <ButtonLink href="/fragrance-finder" size="lg">
              להתחלת ההתאמה
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ================= REVIEWS ================= */}
      <ReviewsSection />

      {/* ================= BRANCHES ================= */}
      <BranchesSection />
    </>
  );
}

/**
 * Only approved, real reviews are ever shown. There are none yet, and inventing
 * testimonials is forbidden — so this renders an honest empty state.
 */
async function ReviewsSection() {
  const reviews = await db.review.findMany({
    where: { status: 'APPROVED' },
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { nameHe: true, slug: true } } },
  });

  return (
    <section aria-labelledby="reviews-heading" className="border-t border-gold/10 py-24">
      <div className="container-editorial">
        <h2 id="reviews-heading" className="font-serif text-4xl text-ivory">
          מה אומרים הלקוחות
        </h2>

        {reviews.length === 0 ? (
          <p className="mt-6 max-w-xl text-muted">
            עדיין אין ביקורות שאושרו לפרסום. ביקורות יופיעו כאן לאחר רכישה ואישור.
          </p>
        ) : (
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-sm border border-gold/15 bg-charcoal p-6">
                <p className="ltr-nums text-gold" aria-label={`דירוג ${review.rating} מתוך 5`}>
                  {'★'.repeat(review.rating)}
                </p>
                {review.titleHe && (
                  <h3 className="mt-3 font-serif text-lg text-ivory">{review.titleHe}</h3>
                )}
                <p className="mt-2 text-sm leading-relaxed text-cream/80">{review.bodyHe}</p>
                <Link
                  href={`/shop/${review.product.slug}`}
                  className="mt-4 inline-block text-xs text-gold hover:text-cream"
                >
                  {review.product.nameHe}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Verified branches only. No invented addresses — see docs/MISSING_BUSINESS_DATA.md §3. */
async function BranchesSection() {
  const branches = await db.branch.findMany({
    where: { isPublished: true },
    orderBy: { position: 'asc' },
    take: 4,
  });

  return (
    <section aria-labelledby="branches-heading" className="border-t border-gold/10 py-24">
      <div className="container-editorial">
        <h2 id="branches-heading" className="font-serif text-4xl text-ivory">
          הסניפים שלנו
        </h2>

        {branches.length === 0 ? (
          <div className="mt-6 max-w-xl">
            <p className="text-muted">
              פרטי הסניפים יתעדכנו בקרוב. בינתיים נשמח לענות על כל שאלה.
            </p>
            <div className="mt-6">
              <ButtonLink href="/contact" variant="secondary">
                ליצירת קשר
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {branches.map((branch) => (
              <li key={branch.id} className="rounded-sm border border-gold/15 bg-charcoal p-6">
                <h3 className="font-serif text-xl text-ivory">{branch.nameHe}</h3>
                <p className="mt-2 text-sm text-muted">{branch.addressHe}</p>
                <p className="text-sm text-muted">{branch.cityHe}</p>
                {branch.openingHoursHe && (
                  <p className="mt-3 text-xs text-faint">{branch.openingHoursHe}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
