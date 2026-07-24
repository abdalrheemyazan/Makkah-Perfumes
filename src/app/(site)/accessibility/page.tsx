import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'הצהרת נגישות' };

export default function Page() {
  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">הצהרת נגישות</h1>
        <p className="mt-6 text-base leading-relaxed text-cream/85">
          האתר נבנה במטרה לעמוד בתקן WCAG 2.2 ברמה AA: ניווט מלא במקלדת, סימון
          פוקוס נראה, טקסט חלופי בעברית לכל תמונת מוצר, ניגודיות מספקת, וכיבוד
          העדפת המערכת לצמצום אנימציות.
        </p>
        <div role="note" className="mt-8 rounded-sm border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-warning">
          <p className="font-medium">פרטי רכז הנגישות טרם התקבלו</p>
          <p className="mt-1.5">
            לפי תקנות הנגישות בישראל יש לפרסם כאן שם רכז נגישות ודרכי יצירת קשר.
            הפרטים יתעדכנו עם קבלתם.
          </p>
        </div>
      </div>
    </div>
  );
}
