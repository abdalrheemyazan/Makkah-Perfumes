import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { getFeaturedProducts, getFragranceFamilies } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { ScrollCue } from '@/components/home/scroll-cue';
import { CinematicHero } from '@/components/home/cinematic-hero';
import { StorySequence, type StoryChapter } from '@/components/home/story-sequence';
import { FragranceDiscovery } from '@/components/home/fragrance-discovery';

/**
 * Homepage.
 *
 * Section order is deliberate: the visitor meets the product, then learns where
 * it comes from, and only then is asked to shop. Selling before the story made
 * the page read as a catalogue with a banner on top.
 *
 *   1. Hero            — the product, in its light
 *   2. Story           — scroll-scrubbed origin sequence
 *   3. Shop            — featured products
 *   4. Discovery       — guided route into the catalogue
 *   5. Frankincense    — heritage context
 *   6. Reviews/Stores  — one quiet honest band
 *
 * Sections alternate between the base ink surface and the raised charcoal
 * surface so the eye gets a rhythm instead of one long dark scroll.
 */

const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'resin',
    eyebrowHe: 'חומר הגלם',
    titleHe: 'שרף הלבונה',
    bodyHe:
      'הכול מתחיל בשרף שנאסף מגזע עץ הבוסוואליה ומתקשה באוויר לטיפות ענבריות, חלקן שקופות וחלקן מכוסות אבקה עדינה.',
    image: '/generated/cinematic/scene-frankincense.webp',
    imageMobile: '/generated/mobile/scene-frankincense-mobile.webp',
    altHe: 'תקריב של שרף לבונה טבעי בגוונים ענבריים על אבן שחורה, מואר באור צד חם',
  },
  {
    id: 'smoke',
    eyebrowHe: 'העשן',
    titleHe: 'הריח העולה',
    bodyHe:
      'על גחלת נמוכה השרף נפתח לריח יבש והדרי, ומתייצב לעומק שרפי וחם — הבסיס של שפת הבישום של דרום ערב.',
    image: '/generated/cinematic/scene-incense.webp',
    imageMobile: '/generated/mobile/scene-incense-mobile.webp',
    altHe: 'מבער קטורת מפליז על לוח אבן שחורה, עם סרט עשן דק העולה בקרן אור ענברית',
  },
  {
    id: 'craft',
    eyebrowHe: 'המלאכה',
    titleHe: 'שמן הבושם',
    bodyHe:
      'טיפה אחר טיפה נמזגת התמצית ונבנית לפורמולה. כל תו נמדד, נבדק ומותאם עד שהאיזון מתייצב.',
    image: '/generated/cinematic/scene-craft.webp',
    imageMobile: '/generated/mobile/scene-craft-mobile.webp',
    altHe: 'פיפטת זכוכית מטפטפת טיפת שמן בושם ענברית לכלי זכוכית שקוף על שולחן עץ כהה',
  },
  {
    id: 'bottle',
    eyebrowHe: 'התוצאה',
    titleHe: 'הבקבוק',
    bodyHe:
      'זכוכית מסותתת, פליז מוברש ותווית שנושאת את השם. שלוש עשרה יצירות שמרכיבות את שפת הבית.',
    image: '/generated/posters/hero-poster.webp',
    imageMobile: '/generated/posters/hero-poster-mobile.webp',
    altHe:
      'בקבוק הבושם Royal Leather עומד על כן אבן שחורה מלוטשת, מואר באור ענברי חם על רקע כהה',
  },
];

export default async function HomePage() {
  const [featured, families, heroBlock, storyBlock] = await Promise.all([
    getFeaturedProducts(6),
    getFragranceFamilies(),
    db.contentBlock.findUnique({ where: { key: 'home.hero' } }),
    db.contentBlock.findUnique({ where: { key: 'home.brand-story' } }),
  ]);

  const hero = featured.find((product) => product.slug === 'royal-leather') ?? featured[0] ?? null;

  return (
    <>
      {/* ===== 1 · HERO ===== */}
      <div className="relative">
        <CinematicHero
          // Media paths are editable from the admin content screen; the
          // generated assets are the defaults.
          stagePlate={heroBlock?.mediaUrl ?? '/generated/cinematic/hero-stage.webp'}
          posterDesktop={heroBlock?.posterUrl ?? '/generated/posters/hero-poster.webp'}
          posterMobile={heroBlock?.mobileUrl ?? '/generated/posters/hero-poster-mobile.webp'}
          productSrc={hero?.imageUrl ?? '/brand-reference/products/royal-leather.avif'}
          productAltHe={hero?.imageAltHe ?? 'בקבוק הבושם Royal Leather של מכה פרפיומס'}
          eyebrowHe="מורשת של בישום עומאני"
          titleHe={heroBlock?.titleHe ?? 'ניחוח שנשאר איתך'}
          bodyHe={
            heroBlock?.bodyHe ??
            'בשמי יוקרה, לבונה וקטורת שנוצרו מתוך מסורת, חומרי גלם ואהבה לפרטים.'
          }
          primaryCtaHe={heroBlock?.ctaLabelHe ?? 'לגלות את הקולקציה'}
          primaryCtaHref={heroBlock?.ctaHref ?? '/shop'}
          secondaryCtaHe="למציאת הניחוח שלך"
          secondaryCtaHref="/fragrance-finder"
        />
        <ScrollCue />
      </div>

      {/* ===== 2 · STORY ===== */}
      <StorySequence
        headingHe={storyBlock?.titleHe ?? 'מהמסורת העומאנית אל הניחוח המודרני'}
        introHe={storyBlock?.bodyHe ?? ''}
        chapters={STORY_CHAPTERS}
      />

      {/* ===== 3 · SHOP ===== */}
      <section
        aria-labelledby="featured-heading"
        className="mx-auto w-full max-w-[110rem] px-5 py-28 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs tracking-[0.28em] text-gold/90 uppercase sm:text-sm">
              הקולקציה
            </p>
            <h2
              id="featured-heading"
              className="mt-5 font-serif text-4xl leading-[1.12] text-ivory sm:text-5xl"
            >
              בשמים נבחרים
            </h2>
          </div>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 pb-2 text-sm text-cream transition-colors hover:text-gold"
          >
            לכל הבשמים
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-3 lg:gap-x-8 xl:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 2} />
            ))}
          </div>
        ) : (
          <p className="mt-14 text-muted">הקטלוג יתעדכן בקרוב.</p>
        )}
      </section>

      {/* ===== 4 · DISCOVERY ===== */}
      <FragranceDiscovery
        families={families.map((family) => ({
          id: family.id,
          slug: family.slug,
          nameHe: family.nameHe,
          descriptionHe: family.descriptionHe,
          accentColor: family.accentColor,
          count: family._count.products,
        }))}
      />

      {/* ===== 5 · FRANKINCENSE ===== */}
      <section
        aria-labelledby="frankincense-heading"
        className="relative overflow-hidden py-28 lg:py-36"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 55% 80% at 78% 45%, color-mix(in oklab, var(--color-amber) 34%, transparent), transparent 68%)',
          }}
        />
        <div className="relative mx-auto w-full max-w-[110rem] px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-xs tracking-[0.28em] text-gold/90 uppercase sm:text-sm">
              לבונה וקטורת
            </p>
            <h2
              id="frankincense-heading"
              className="mt-5 font-serif text-4xl leading-[1.12] text-ivory sm:text-5xl"
            >
              עולם הלבונה והקטורת
            </h2>
            <p className="mt-7 text-base leading-[1.9] text-cream/80">
              שרף הלבונה נאסף מגזעי עצי בוסוואליה ומשמש בבישום מזה אלפי שנים.
              הוא עומד בבסיס שפת הריח של דרום ערב — עשן יבש, הדרי בפתיחה ושרפי בעומק.
            </p>
            <div className="mt-10">
              <ButtonLink href="/frankincense-and-incense" variant="secondary" size="lg">
                לגלות את עולם הלבונה והקטורת
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6 · REVIEWS + STORES ===== */}
      <CommunityBand />
    </>
  );
}

/**
 * Reviews and branches, side by side.
 *
 * Both are honest empty states — there are no approved reviews and no verified
 * branch addresses yet, and neither will be invented. As two full-width
 * sections they read as two apologies in a row; paired in one quiet band they
 * read as a single status note and the page stops feeling stacked.
 */
async function CommunityBand() {
  const [reviews, branches] = await Promise.all([
    db.review.findMany({
      where: { status: 'APPROVED' },
      take: 2,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { nameHe: true, slug: true } } },
    }),
    db.branch.findMany({ where: { isPublished: true }, orderBy: { position: 'asc' }, take: 3 }),
  ]);

  return (
    <section className="border-t border-gold/10 bg-charcoal py-24 lg:py-28">
      <div className="mx-auto grid w-full max-w-[110rem] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12">
        {/* Reviews */}
        <div>
          <h2 id="reviews-heading" className="font-serif text-2xl text-ivory sm:text-3xl">
            מה אומרים הלקוחות
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              עדיין אין ביקורות שאושרו לפרסום. ביקורות יופיעו כאן לאחר רכישה ואישור —
              לא נכתבו כאן המלצות לדוגמה.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-5">
              {reviews.map((review) => (
                <li key={review.id}>
                  <p className="ltr-nums text-gold" aria-label={`דירוג ${review.rating} מתוך 5`}>
                    {'★'.repeat(review.rating)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-cream/80">{review.bodyHe}</p>
                  <Link
                    href={`/shop/${review.product.slug}`}
                    className="mt-2 inline-block text-xs text-gold hover:text-cream"
                  >
                    {review.product.nameHe}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Branches */}
        <div className="lg:border-s lg:border-gold/10 lg:ps-20">
          <h2 id="branches-heading" className="font-serif text-2xl text-ivory sm:text-3xl">
            הסניפים שלנו
          </h2>
          {branches.length === 0 ? (
            <>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                פרטי הסניפים יתעדכנו בקרוב. בינתיים נשמח לענות על כל שאלה.
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-flex h-11 items-center rounded-sm border border-gold/40 px-5 text-sm text-cream transition-colors hover:border-gold hover:text-ivory"
              >
                ליצירת קשר
              </Link>
            </>
          ) : (
            <ul className="mt-6 flex flex-col gap-5">
              {branches.map((branch) => (
                <li key={branch.id}>
                  <h3 className="font-serif text-lg text-ivory">{branch.nameHe}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {branch.addressHe}, {branch.cityHe}
                  </p>
                  {branch.openingHoursHe && (
                    <p className="text-xs text-faint">{branch.openingHoursHe}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
