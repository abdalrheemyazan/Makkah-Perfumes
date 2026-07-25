import type { Metadata } from 'next';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = { title: 'יצירת קשר' };

export default function Page() {
  return (
    <>
      <PageIdentity
        titleHe="יצירת קשר"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'יצירת קשר' }]}
        descriptionHe="נשמח לענות על שאלות בנוגע למוצרים, להזמנות ולמשלוחים."
      />
      <div className="container-editorial pt-10 pb-24">
      <div className="mx-auto max-w-2xl">
        <div role="note" className="rounded-sm border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-warning">
          <p className="font-medium">פרטי יצירת קשר טרם התקבלו</p>
          <p className="mt-1.5">
            טלפון, כתובת דוא״ל ושעות מענה של שירות הלקוחות יתעדכנו כאן עם קבלתם.
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
