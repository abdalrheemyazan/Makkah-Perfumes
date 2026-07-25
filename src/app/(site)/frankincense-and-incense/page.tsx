import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import { PageIdentity } from '@/components/layout/page-identity';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'קטורת ולבונה',
  description: 'עולם הלבונה והקטורת של מכה פרפיומס — שפת הריח של דרום ערב.',
  alternates: { canonical: '/frankincense-and-incense' },
};

/**
 * Editorial + commerce page for the frankincense / incense category.
 *
 * All copy here is botanical and olfactory description — factual, non-medical,
 * non-religious. No therapeutic or cultural claims are made (see CLAUDE.md).
 * Products come from the real "leather-incense" fragrance family; if none are
 * published the listing degrades to an honest empty state.
 */

const SECTIONS = [
  {
    titleHe: 'מהי לבונה?',
    bodyHe:
      'לבונה היא שרף ריחני שנאסף מגזעי עצי בוסוואליה הגדלים בדרום ערב ובקרן אפריקה. חתך עדין בגזע מפריש טיפות שרף שמתקשות באוויר לגושים ענבריים — חלקם שקופים וחלקם מכוסים אבקה עדינה.',
  },
  {
    titleHe: 'פרופיל הריח',
    bodyHe:
      'בפתיחה הלבונה הדרית וטרפנטינית, ומתייצבת ליובש שרפי וחמים עם נגיעה חלבית. היא משמשת גם כתו פתיחה מרענן וגם כעוגן עמוק בבסיס — הבסיס של שפת הבישום של דרום ערב.',
  },
  {
    titleHe: 'קטורת בבישום',
    bodyHe:
      'בבשמים משתלבת הלבונה עם עוד, עצים וענבר ליצירת עומק מעושן ומעטפת חמה. התוצאה היא ניחוח נוכח ומתמשך, המתאים במיוחד לערב ולעונות הקרות.',
  },
] as const;

const FAQ = [
  {
    qHe: 'מה ההבדל בין לבונה לקטורת?',
    aHe: 'לבונה היא שם השרף עצמו. "קטורת" מתאר את השימוש — חומרים ריחניים שנשרפים או מתאדים כדי לפזר ריח. בקטלוג שלנו מדובר בבשמים שנבנים סביב שפת הריח הזו.',
  },
  {
    qHe: 'למתי מתאימים בשמי הלבונה והקטורת?',
    aHe: 'בזכות העומק השרפי והחום שלהם, ניחוחות אלו מתאימים במיוחד לערב, לאירועים ולעונות הקרות. עדיין, כל אחד יכול לשאת אותם מתי שירצה.',
  },
  {
    qHe: 'איך שומרים על הבושם?',
    aHe: 'מומלץ לאחסן במקום קריר, יבש ומוגן מאור שמש ישיר, כדי לשמר את יציבות הניחוח לאורך זמן.',
  },
] as const;

export default async function FrankincensePage() {
  const rows = await db.product.findMany({
    where: { status: 'PUBLISHED', fragranceFamily: { slug: 'leather-incense' } },
    select: { ...cardSelect, fragranceFamily: { select: { nameHe: true, slug: true } } },
    take: 8,
  });
  const products = rows
    .map(toCard)
    .filter((card): card is ProductCardData => card !== null);

  return (
    <>
      <PageIdentity
        titleHe="קטורת ולבונה"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'קטורת ולבונה' }]}
        descriptionHe="שרף הלבונה עומד בבסיס שפת הריח של דרום ערב — עשן יבש, הדרי בפתיחה ושרפי בעומק."
      />

      <div className="container-editorial pt-10 pb-24">
        {/* Educational sections — factual, non-medical */}
        <div className="grid gap-8 md:grid-cols-3">
          {SECTIONS.map((section) => (
            <section key={section.titleHe} className="rounded-lg border border-gold/12 bg-charcoal/60 p-6">
              <h2 className="text-lg font-semibold text-ivory">{section.titleHe}</h2>
              <p className="mt-3 text-sm leading-relaxed text-cream/80">{section.bodyHe}</p>
            </section>
          ))}
        </div>

        {/* Product listing */}
        <section aria-labelledby="incense-products" className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="incense-products" className="text-2xl font-semibold text-ivory sm:text-3xl">
              בשמי לבונה וקטורת
            </h2>
            <ButtonLink href="/shop?family=leather-incense" variant="secondary" size="sm">
              לכל המשפחה
            </ButtonLink>
          </div>

          {products.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-gold/15 bg-charcoal p-10 text-center">
              <p className="text-base font-semibold text-ivory">בקרוב בקטגוריה זו</p>
              <p className="mt-2 text-sm text-muted">
                בשמי הלבונה והקטורת יופיעו כאן. בינתיים אפשר לעיין בכל הקולקציה.
              </p>
              <div className="mt-6">
                <ButtonLink href="/shop">לכל הבשמים</ButtonLink>
              </div>
            </div>
          )}
        </section>

        {/* FAQ */}
        <section aria-labelledby="incense-faq" className="mt-16 max-w-3xl">
          <h2 id="incense-faq" className="text-2xl font-semibold text-ivory sm:text-3xl">
            שאלות נפוצות
          </h2>
          <div className="mt-6 flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.qHe}
                className="group rounded-lg border border-gold/12 bg-charcoal/60 p-5 open:border-gold/30"
              >
                <summary className="cursor-pointer list-none text-base font-medium text-ivory marker:content-['']">
                  {item.qHe}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-cream/80">{item.aHe}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-lg border border-gold/15 bg-charcoal/70 px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold text-ivory">מוכנים לגלות את הניחוח שלכם?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-cream/75">
            ענו על כמה שאלות קצרות ונתאים לכם ניחוח מתוך הקולקציה.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/fragrance-finder">למציאת הניחוח שלכם</ButtonLink>
            <ButtonLink href="/shop" variant="secondary">
              לכל הבשמים
            </ButtonLink>
          </div>
        </section>
      </div>
    </>
  );
}
