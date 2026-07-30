import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIdentity } from '@/components/layout/page-identity';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'יצירת קשר',
  description: 'צרו קשר עם מכה פרפיומס — שאלות על מוצרים, הזמנות ומשלוחים.',
  alternates: { canonical: '/contact' },
};

export default function Page() {
  return (
    <>
      <PageIdentity
        titleHe="יצירת קשר"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'יצירת קשר' }]}
        descriptionHe="נשמח לענות על שאלות בנוגע למוצרים, להזמנות ולמשלוחים."
      />
      <div className="container-editorial pt-10 pb-24">
        <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_18rem]">
          <div>
            <h2 className="text-xl font-semibold text-ivory">שליחת פנייה</h2>
            <p className="mt-2 text-sm text-cream/75">
              מלאו את הטופס ונחזור אליכם בהקדם. שדות המסומנים נדרשים למענה.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-gold/15 bg-charcoal/60 p-5 text-sm leading-relaxed text-cream/80">
              <p className="font-medium text-ivory">איך נוכל לעזור?</p>
              <p className="mt-1.5">
                אפשר לפנות בנוגע לבחירת ניחוח, להזמנה קיימת, למשלוח או להחזרה.
                בנוגע להזמנה קיימת, מומלץ לצרף את מספר ההזמנה.
              </p>
            </div>
            <div className="rounded-lg border border-gold/15 bg-charcoal/60 p-5 text-sm leading-relaxed text-cream/80">
              <p className="font-medium text-ivory">נגישות</p>
              <p className="mt-1.5">
                האתר תומך בניווט מקלדת ובתפריט נגישות ייעודי. לפרטים ראו{' '}
                <Link href="/accessibility" className="text-gold underline underline-offset-2 hover:text-cream">
                  הצהרת נגישות
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
