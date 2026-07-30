import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/legal/legal-page';

export const metadata: Metadata = { title: 'מדיניות עוגיות' };

const LAST_UPDATED = '30 ביולי 2026';

const storageRows = [
  ['הפעלה', 'makkah_session', 'זיהוי התחברות מאובטחת לחשבון', '30 יום', 'כן'],
  ['סל קניות', 'makkah_cart', 'קישור הדפדפן לסל השמור במסד הנתונים', '60 יום', 'כן'],
  ['נגישות', 'makkah-a11y (localStorage)', 'שמירת גודל טקסט, ניגודיות, הדגשת קישורים והעדפות תנועה', 'עד איפוס ההעדפות או ניקוי נתוני הדפדפן', 'לא'],
  ['התקנת PWA', 'makkah-pwa-installed (localStorage)', 'מניעת הצגת בקשת התקנה לאחר שהאפליקציה הותקנה', 'עד ניקוי נתוני הדפדפן', 'לא'],
] as const;

const sections: LegalSection[] = [
  {
    id: 'what-is-cookie',
    titleHe: 'מהן עוגיות וטכנולוגיות אחסון',
    content: <p>עוגייה היא ערך קטן שהדפדפן שולח לאתר בבקשות חוזרות. אחסון מקומי נשמר בדפדפן ואינו נשלח אוטומטית לשרת. האתר משתמש גם במטמון שירות כדי לאפשר טעינה יעילה וחוויית PWA.</p>,
  },
  {
    id: 'used-technologies',
    titleHe: 'הטכנולוגיות שבהן האתר משתמש',
    content: (
      <div className="overflow-x-auto rounded-sm border border-gold/15">
        <table className="min-w-[46rem] w-full border-collapse text-right text-sm">
          <thead className="bg-charcoal text-ivory">
            <tr>
              {['קטגוריה', 'שם הטכנולוגיה', 'מטרה', 'משך אחסון', 'הכרחית'].map((heading) => (
                <th key={heading} scope="col" className="border-b border-gold/15 px-4 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {storageRows.map((row) => (
              <tr key={row[1]} className="border-b border-gold/10 last:border-0">
                {row.map((cell, index) => <td key={cell} className={`px-4 py-3 align-top ${index === 1 ? 'font-mono text-xs text-gold' : ''}`} dir={index === 1 ? 'ltr' : undefined}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 'necessary',
    titleHe: 'עוגיות הכרחיות',
    content: <p>עוגיות ההפעלה והסל דרושות כדי לזהות חשבון מחובר ולשמור את הסל בין עמודים וביקורים. האסימונים אטומים ואינם מכילים את תוכן הסל או את הסיסמה. חסימתן עלולה למנוע התחברות, שמירת סל או השלמת הזמנה.</p>,
  },
  {
    id: 'local-storage',
    titleHe: 'אחסון מקומי והעדפות',
    content: <p>העדפות הנגישות נשמרות מקומית כדי להחיל אותן לפני הצגת העמוד בביקור הבא. סימון התקנת ה-PWA נשמר כדי שלא להציג שוב הצעת התקנה לאחר התקנה מוצלחת. נתונים אלה אינם משמשים ליצירת פרופיל פרסומי.</p>,
  },
  {
    id: 'pwa-cache',
    titleHe: 'מטמון PWA ושירות עובד',
    content: <p>שירות ה-PWA עשוי לשמור קובצי ממשק סטטיים עד שנה, תמונות ציבוריות עד 30 יום ועמודים ציבוריים עד יום אחד, בכפוף לפינוי אוטומטי של הדפדפן. עמודי חשבון, סל, תשלום, הזמנות, ניהול ובקשות שינוי אינם מוגשים מן המטמון. קבצי מטמון אינם עוגיות.</p>,
  },
  {
    id: 'no-advertising',
    titleHe: 'פרסום ומעקב',
    content: <p><strong>נכון למועד העדכון, האתר אינו מפעיל עוגיות פרסום או מעקב התנהגותי של רשתות פרסום.</strong> גם Google Analytics, Meta Pixel ופלטפורמות פרסום דומות אינן משולבות בקוד האתר.</p>,
  },
  {
    id: 'manage',
    titleHe: 'ניהול וניקוי נתוני דפדפן',
    content: <p>ניתן למחוק עוגיות, אחסון מקומי ונתוני אתר דרך הגדרות הפרטיות של הדפדפן, בדרך כלל תחת „עוגיות ונתוני אתרים” או „ניקוי נתוני גלישה”. ניקוי הנתונים עשוי לנתק את החשבון, לרוקן את הסל המקומי, לאפס העדפות נגישות ולהסיר קבצים לשימוש לא מקוון.</p>,
  },
  {
    id: 'changes',
    titleHe: 'שינויים במדיניות',
    content: <p>אם יתווספו כלי מדידה, ספקי תשלום או טכנולוגיות אחסון אחרות, הטבלה וההסבר יעודכנו לפני השימוש בהם. תאריך העדכון בראש העמוד מציג את הגרסה הנוכחית.</p>,
  },
];

export default function Page() {
  return (
    <LegalPage
      titleHe="מדיניות עוגיות"
      lastUpdatedHe={LAST_UPDATED}
      introHe="העמוד מפרט את העוגיות, האחסון המקומי ומטמוני ה-PWA שבהם האתר משתמש בפועל."
      sections={sections}
    />
  );
}
