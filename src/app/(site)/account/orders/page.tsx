import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/commerce/labels';
import { ButtonLink } from '@/components/ui/button';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = { title: 'ההזמנות שלי', robots: { index: false } };

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Scoped by userId: a customer can only ever see their own orders.
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: 'desc' },
    include: { items: true },
  });

  return (
    <>
      <PageIdentity
        titleHe="ההזמנות שלי"
        breadcrumb={[
          { labelHe: 'בית', href: '/' },
          { labelHe: 'החשבון שלי', href: '/account' },
          { labelHe: 'ההזמנות שלי' },
        ]}
      />
      <div className="container-editorial pt-10 pb-24">

      {orders.length === 0 ? (
        <div className="rounded-lg border border-gold/15 bg-charcoal p-10 text-center">
          <p className="font-serif text-xl text-ivory">אין עדיין הזמנות</p>
          <p className="mt-2 text-sm text-muted">כשתבצעו הזמנה, היא תופיע כאן.</p>
          <div className="mt-6">
            <ButtonLink href="/shop">למעבר לחנות</ButtonLink>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-lg border border-gold/15 bg-charcoal p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="ltr-nums font-medium text-ivory hover:text-gold"
                    dir="ltr"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="mt-1 text-xs text-muted">{formatDateHe(order.placedAt)}</p>
                </div>
                <div className="text-end">
                  <p className="ltr-nums text-lg text-cream">{formatPrice(order.totalAgorot)}</p>
                  <p className="mt-1 text-xs text-gold">
                    {ORDER_STATUS_LABELS[order.status]} ·{' '}
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </p>
                </div>
              </div>

              {order.isDevelopmentOrder && (
                <p className="mt-3 text-xs text-warning">
                  הזמנת פיתוח — לא בוצע חיוב אמיתי.
                </p>
              )}

              <ul className="mt-4 flex flex-col gap-1.5 border-t border-gold/10 pt-4 text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span className="text-cream/85">
                      {item.productNameHe}
                      <span className="ms-2 text-xs text-faint">
                        × <span className="ltr-nums">{item.quantity}</span>
                      </span>
                    </span>
                    <span className="ltr-nums shrink-0 text-muted">
                      {formatPrice(item.lineTotalAgorot)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      </div>
    </>
  );
}
