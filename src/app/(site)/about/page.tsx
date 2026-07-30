import type { Metadata } from 'next';
import Image from 'next/image';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = { title: 'הסיפור שלנו' };

export default function Page() {
  const values = [
    {
      titleHe: 'מורשת',
      bodyHe: 'השראה מעולם הבישום הערבי והעומאני וממסורת שהחלה בשנת 1976.',
    },
    {
      titleHe: 'יצירה',
      bodyHe: 'שילוב בין חומרי גלם, מבנה ניחוח ועיצוב בעל זהות ברורה.',
    },
    {
      titleHe: 'איכות',
      bodyHe: 'תשומת לב לפרטים בכל שלב — מן הקומפוזיציה ועד להצגת המוצר.',
    },
    {
      titleHe: 'חוויית לקוח',
      bodyHe: 'חנות דיגיטלית ברורה, שירות אישי ותהליך הזמנה מסודר.',
    },
  ];

  return (
    <>
      <PageIdentity
        titleHe="הסיפור שלנו"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'הסיפור שלנו' }]}
      />
      <div className="container-editorial pt-10 pb-24">
        <section className="grid items-start gap-12 border-b border-gold/15 pb-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.75fr)] lg:gap-20">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-gold">עומאן · 1976</p>
            <p className="mt-5 max-w-3xl text-2xl leading-[1.65] text-ivory sm:text-3xl">
              המסע של <span dir="ltr" lang="en">Makkah Perfumes</span> החל בשנת 1976
              בסולטנות עומאן, מתוך תשוקה ליצירת ניחוחות המחברים בין מסורת הבישום
              הערבית והעומאנית לבין גישה מודרנית ומדויקת.
            </p>
          </div>

          <aside className="relative overflow-hidden rounded-sm border border-gold/20 bg-charcoal/70 p-7">
            <div aria-hidden="true" className="absolute inset-y-0 start-0 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
            <Image
              src="/brand-reference/logo/logo-ivory.png"
              alt=""
              width={512}
              height={438}
              className="h-14 w-auto object-contain opacity-90"
            />
            <p className="mt-8 text-5xl font-light text-gold" dir="ltr">1976</p>
            <p className="mt-2 text-sm text-cream/70">ראשיתה של מסורת הבישום של הבית בסולטנות עומאן.</p>
          </aside>
        </section>

        <section className="grid gap-12 py-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-gold">הדרך</p>
            <p className="mt-5 text-base leading-[1.95] text-cream/85">
              לאורך השנים התפתח המותג והרחיב את עולמו למבחר של בשמים מזרחיים
              ומערביים, קטורת ולבונה עומאנית. בלב העשייה עומדים החיבור לחומרי גלם
              המזוהים עם תרבות הבישום באזור, מלאכת הרכבה מוקפדת, עיצוב בקבוקים בעל
              נוכחות וחיפוש מתמשך אחר חוויות ריח ייחודיות.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-gold">החנות הדיגיטלית</p>
            <p className="mt-5 text-base leading-[1.95] text-cream/85">
              בחנות הדיגיטלית של <span dir="ltr" lang="en">Makkah Perfumes</span> אנו
              מבקשים להציג את הקולקציה בצורה ברורה, אלגנטית ונוחה, ולאפשר לכל לקוח
              להכיר את מבנה הניחוח, לבחור את המוצר המתאים לו ולבצע הזמנה בתהליך
              פשוט ומסודר.
            </p>
          </div>
        </section>

        <div className="rule-brass" />

        <section aria-labelledby="values-heading" className="py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-gold">הערכים שלנו</p>
              <h2 id="values-heading" className="mt-3 text-3xl text-ivory">מה שמנחה את העשייה</h2>
            </div>
          </div>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-sm border border-gold/15 bg-gold/15 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <li key={value.titleHe} className="bg-ink-raised p-6 motion-safe:transition-colors hover:bg-charcoal">
                <h3 className="text-lg text-ivory">{value.titleHe}</h3>
                <p className="mt-3 text-sm leading-[1.8] text-cream/70">{value.bodyHe}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-gold/15 py-12 sm:px-8">
          <p className="text-xs font-medium tracking-[0.16em] text-gold">החזון</p>
          <p className="mt-4 max-w-4xl text-xl leading-[1.75] text-ivory sm:text-2xl">
            החזון שלנו הוא לשמר את האופי העומאני והערבי של המותג, ובמקביל להמשיך
            להתפתח, לחדש ולהציע יצירות המתאימות לקהל המודרני.
          </p>
        </section>
      </div>
    </>
  );
}
