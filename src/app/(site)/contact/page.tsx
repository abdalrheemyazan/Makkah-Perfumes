import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'יצירת קשר' };

export default function Page() {
  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">יצירת קשר</h1>
        <p className="mt-6 text-base leading-relaxed text-cream/85">
          נשמח לענות על שאלות בנוגע למוצרים, להזמנות ולמשלוחים.
        </p>
        <div role="note" className="mt-8 rounded-sm border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-warning">
          <p className="font-medium">פרטי יצירת קשר טרם התקבלו</p>
          <p className="mt-1.5">
            טלפון, כתובת דוא״ל ושעות מענה של שירות הלקוחות יתעדכנו כאן עם קבלתם.
          </p>
        </div>
      </div>
    </div>
  );
}
