
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { getFeaturedProducts, getFragranceFamilies } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { ScrollCue } from '@/components/home/scroll-cue';
import { CinematicHero } from '@/components/home/cinematic-hero';
import { StorySequence, type StoryChapter } from '@/components/home/story-sequence';

/**
 * Story chapters.
 *
 * Each image is a real generated asset that exists on disk — no placeholder
 * paths. The copy describes materials and process, and makes no unverifiable
 * claim about the brand's history.
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
      {/* ================= HERO ================= */}
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

      {/* ================= BRAND STORY (scroll-scrubbed) ================= */}
      <StorySequence
        headingHe={storyBlock?.titleHe ?? 'מהמסורת העומאנית אל הניחוח המודרני'}
        introHe={storyBlock?.bodyHe ?? ''}
        chapters={STORY_CHAPTERS}
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
