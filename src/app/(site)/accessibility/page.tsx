import type { Metadata } from 'next';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = { title: 'הצהרת נגישות' };

/**
 * Accessibility statement.
 *
 * States the standard the site targets and the concrete adjustments already in
 * place, and is honest about what is not yet done. Per the project's data rule,
 * it makes NO claim of certified legal compliance and invents no coordinator
 * contact details — those are marked as pending admin configuration.
 */

const LAST_REVIEW = 'יולי 2026';

function Section({ titleHe, children }: { titleHe: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ivory">{titleHe}</h2>
      <div className="mt-2 text-sm leading-relaxed text-cream/85">{children}</div>
    </section>
  );
}

export default function Page() {
  return (
    <>
      <PageIdentity
        titleHe="הצהרת נגישות"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'הצהרת נגישות' }]}
      />

      <div className="container-editorial pt-10 pb-24">
        <div className="mx-auto max-w-2xl">
          <Section titleHe="המחויבות שלנו">
            אנו רואים בנגישות האתר חלק בלתי נפרד ממתן שירות שוויוני, ופועלים כדי
            שכלל התכנים והפעולות יהיו זמינים למגוון רחב של משתמשים ושל טכנולוגיות
            מסייעות. הנגישות נבחנת ומשופרת באופן שוטף.
          </Section>

          <Section titleHe="התקן שאליו אנו חותרים">
            האתר נבנה במטרה לעמוד בהנחיות <span dir="ltr">WCAG 2.2</span> ברמה{' '}
            <span dir="ltr">AA</span>, בהתאם לתקן הישראלי{' '}
            <span dir="ltr">ת&quot;י 5568</span> ולתקנות שוויון זכויות לאנשים עם
            מוגבלות (התאמות נגישות לשירות). זהו יעד עבודה — טרם בוצעה בדיקת נגישות
            חיצונית מלאה, ולכן איננו מצהירים על עמידה מוסמכת ומלאה בתקן.
          </Section>

          <Section titleHe="ההתאמות שכבר קיימות באתר">
            <ul className="flex list-disc flex-col gap-1.5 ps-5">
              <li>ניווט מלא במקלדת וסימון פוקוס נראה בכל רכיב אינטראקטיבי.</li>
              <li>קישור &quot;דילוג לתוכן הראשי&quot; בתחילת כל עמוד.</li>
              <li>מבנה כותרות היררכי וסמנטי, ותוויות לכל שדות הטופס.</li>
              <li>טקסט חלופי בעברית לכל תמונת מוצר.</li>
              <li>תפריט נגישות ייעודי: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, עצירת אנימציות וגופן קריא.</li>
              <li>שמירת העדפות הנגישות בין ביקורים.</li>
            </ul>
          </Section>

          <Section titleHe="ניווט במקלדת">
            ניתן לתפעל את האתר כולו באמצעות מקלדת בלבד. מעבר בין רכיבים נעשה
            במקש <span dir="ltr">Tab</span>, הפעלה במקשי <span dir="ltr">Enter</span> או{' '}
            <span dir="ltr">Space</span>, וסגירת חלונות במקש <span dir="ltr">Esc</span>.
            חלונות קופצים לוכדים את הפוקוס ומחזירים אותו למקום שממנו נפתחו.
          </Section>

          <Section titleHe="תמיכה בקוראי מסך">
            הרכיבים מסומנים בתפקידים ובתוויות מתאימים, ועדכוני מצב (כגון הוספה
            לעגלה) מוכרזים לקוראי מסך. תמונות דקורטיביות מסומנות כך שיושמטו מהקראה.
          </Section>

          <Section titleHe="חלופות לתמונות">
            כל תמונת מוצר נושאת טקסט חלופי בעברית המתאר את הבקבוק. תמונות אווירה
            דקורטיביות מסומנות כ&quot;מוסתרות&quot; מטכנולוגיות מסייעות כדי לא
            להעמיס מידע שאינו חיוני.
          </Section>

          <Section titleHe="צמצום אנימציות">
            האתר מכבד את העדפת המערכת <span dir="ltr">prefers-reduced-motion</span>,
            ובנוסף מאפשר עצירה יזומה של כל האנימציות דרך תפריט הנגישות — כולל תנועת
            העשן, התאורה, החלקיקים והאנימציות המונעות בגלילה.
          </Section>

          <Section titleHe="מגבלות ידועות">
            חלק מתכני צד־שלישי עתידיים (כגון שער תשלום) טרם שולבו ונבדקו. ייתכנו
            רכיבים שבהם הנגישות עדיין בתהליך שיפור. נשמח לקבל דיווח על כל תקלת
            נגישות שתתגלה.
          </Section>

          <div
            role="note"
            className="mt-10 rounded-lg border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-warning"
          >
            <p className="font-semibold">פרטי רכז הנגישות ודרכי הפנייה טרם התקבלו</p>
            <p className="mt-1.5">
              לפי תקנות הנגישות בישראל יש לפרסם כאן שם רכז נגישות ואמצעי יצירת קשר
              לפניות בנושא. הפרטים ינוהלו דרך הגדרות מערכת הניהול ויעודכנו עם
              קבלתם. איננו ממציאים פרטי קשר שלא נמסרו.
            </p>
          </div>

          <p className="mt-8 text-xs text-faint">עודכן לאחרונה: {LAST_REVIEW}</p>
        </div>
      </div>
    </>
  );
}
