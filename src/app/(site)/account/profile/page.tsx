import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'הפרופיל שלי', robots: { index: false } };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-4xl text-ivory">הפרופיל שלי</h1>
        <dl className="mt-8 flex flex-col gap-4 rounded-sm border border-gold/15 bg-charcoal p-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">שם</dt>
            <dd className="text-cream">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">דוא״ל</dt>
            <dd className="text-cream" dir="ltr">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">טלפון</dt>
            <dd className="text-cream" dir="ltr">{user.phone ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">דיוור</dt>
            <dd className="text-cream">{user.acceptsMarketing ? 'מנוי' : 'לא מנוי'}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-faint">
          עריכת פרטים ובקשת מחיקת חשבון יתווספו בשלב הבא.
        </p>
      </div>
    </div>
  );
}
