import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = { title: 'הכתובות שלי', robots: { index: false } };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageIdentity
        titleHe="הכתובות שלי"
        breadcrumb={[
          { labelHe: 'בית', href: '/' },
          { labelHe: 'החשבון שלי', href: '/account' },
          { labelHe: 'כתובות שמורות' },
        ]}
      />
      <div className="container-editorial pt-10 pb-24">

      {addresses.length === 0 ? (
        <p className="text-sm text-muted">
          עדיין לא נשמרו כתובות. כתובת שתזינו בתשלום תישמר כאן אוטומטית.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border border-gold/15 bg-charcoal p-6 text-sm">
              <p className="text-ivory">
                {address.firstName} {address.lastName}
              </p>
              <address className="mt-2 leading-relaxed text-cream/85 not-italic">
                {address.street} {address.houseNumber}
                {address.apartment && `, דירה ${address.apartment}`}
                <br />
                {address.city}
                {address.postalCode && ` ${address.postalCode}`}
                <br />
                <span dir="ltr">{address.phone}</span>
              </address>
            </li>
          ))}
        </ul>
      )}
      </div>
    </>
  );
}
