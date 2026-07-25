import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { ButtonLink } from '@/components/ui/button';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = {
  title: 'סניפים',
  description: 'רשימת הסניפים של מכה פרפיומס.',
  alternates: { canonical: '/stores' },
};

export default async function StoresPage() {
  const branches = await db.branch.findMany({
    where: { isPublished: true },
    orderBy: { position: 'asc' },
  });

  return (
    <>
      <PageIdentity
        titleHe="הסניפים שלנו"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'סניפים' }]}
      />
      <div className="container-editorial pt-10 pb-24">
      {branches.length === 0 ? (
        <div className="max-w-2xl">
          <p className="text-base leading-relaxed text-cream/85">
            פרטי הסניפים יתעדכנו בקרוב.
          </p>
          {/* No invented addresses, and no LocalBusiness structured data without
              verified branches. See docs/MISSING_BUSINESS_DATA.md §3. */}
          <div
            role="note"
            className="mt-6 rounded-sm border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-warning"
          >
            <p className="font-medium">כתובות הסניפים טרם נמסרו</p>
            <p className="mt-1.5">
              כדי לא להציג מידע שגוי, העמוד לא מציג סניפים עד שיתקבלו כתובות,
              שעות פתיחה וטלפונים מאומתים.
            </p>
          </div>
          <div className="mt-8">
            <ButtonLink href="/contact">ליצירת קשר</ButtonLink>
          </div>
        </div>
      ) : (
        /* Accessible list first — it is the primary interface, not a map fallback. */
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <li key={branch.id} className="rounded-sm border border-gold/15 bg-charcoal p-6">
              <h2 className="font-serif text-xl text-ivory">{branch.nameHe}</h2>
              <address className="mt-3 text-sm leading-relaxed text-cream/85 not-italic">
                {branch.addressHe}
                <br />
                {branch.cityHe}
              </address>
              {branch.openingHoursHe && (
                <p className="mt-3 text-sm text-muted">{branch.openingHoursHe}</p>
              )}
              {branch.phone && (
                <p className="mt-2 text-sm">
                  <a href={`tel:${branch.phone}`} className="text-gold hover:text-cream" dir="ltr">
                    {branch.phone}
                  </a>
                </p>
              )}
              {branch.accessibilityHe && (
                <p className="mt-3 text-xs text-faint">{branch.accessibilityHe}</p>
              )}
              {branch.latitude != null && branch.longitude != null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-block text-sm text-gold underline underline-offset-2 hover:text-cream"
                >
                  הוראות הגעה
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      </div>
    </>
  );
}
