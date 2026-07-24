import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'מדיניות עוגיות' };

export default function Page() {
  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">מדיניות עוגיות</h1>
        <div role="note" className="mt-8 rounded-sm border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-warning">
          <p className="font-medium">התוכן המשפטי טרם התקבל</p>
          <p className="mt-1.5">
            נוסח העמוד הזה מחייב אישור משפטי ואת פרטי הישות המשפטית של החברה, שטרם
            נמסרו. ראו docs/MISSING_BUSINESS_DATA.md. העמוד ניתן לעריכה מלוח הניהול.
          </p>
        </div>
      </div>
    </div>
  );
}
