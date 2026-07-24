import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { DELIVERY_METHOD_LABELS } from '@/lib/commerce/labels';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'ההזמנה התקבלה',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ order?: string }>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { order: orderNumber } = await searchParams;
  if (!orderNumber) notFound();

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, shippingAddress: true },
  });

  if (!order) notFound();

  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm tracking-[0.2em] text-gold uppercase">תודה</p>
        <h1 className="mt-3 font-serif text-4xl text-ivory sm:text-5xl">ההזמנה התקבלה</h1>
        <p className="mt-4 text-base text-cream/85">
          מספר ההזמנה שלכם הוא{' '}
          <span className="ltr-nums font-medium text-gold" dir="ltr">
            {order.orderNumber}
          </span>
          . שלחנו אישור לכתובת הדוא״ל שהזנתם.
        </p>

        {order.isDevelopmentOrder && (
          <p
            role="note"
            className="mt-6 rounded-sm border border-warning/50 bg-warning/10 p-4 text-sm leading-relaxed text-warning"
          >
            הזמנה זו נוצרה במצב פיתוח. לא בוצע חיוב אמיתי ולא יישלח משלוח.
          </p>
        )}

        <div className="mt-10 rounded-sm border border-gold/15 bg-charcoal p-6">
          <h2 className="font-serif text-xl text-ivory">פרטי ההזמנה</h2>

          <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted">תאריך</dt>
            <dd className="text-cream">{formatDateHe(order.placedAt)}</dd>
            <dt className="text-muted">אופן משלוח</dt>
            <dd className="text-cream">{DELIVERY_METHOD_LABELS[order.deliveryMethod]}</dd>
          </dl>

          <ul className="mt-6 flex flex-col gap-3 border-t border-gold/15 pt-5">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <div>
                  <p className="text-cream">{item.productNameHe}</p>
                  <p className="text-xs text-faint">
                    {item.variantLabel} · כמות <span className="ltr-nums">{item.quantity}</span>
                  </p>
                </div>
                <p className="ltr-nums shrink-0 text-cream">
                  {formatPrice(item.lineTotalAgorot)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-5 flex flex-col gap-2.5 border-t border-gold/15 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">סכום ביניים</dt>
              <dd className="ltr-nums text-cream">{formatPrice(order.subtotalAgorot)}</dd>
            </div>
            {order.discountAgorot > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">הנחה</dt>
                <dd className="ltr-nums text-success">−{formatPrice(order.discountAgorot)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">משלוח</dt>
              <dd className="ltr-nums text-cream">
                {order.shippingAgorot === 0 ? 'חינם' : formatPrice(order.shippingAgorot)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gold/15 pt-3">
              <dt className="font-serif text-base text-ivory">סה״כ</dt>
              <dd className="ltr-nums font-serif text-lg text-gold">
                {formatPrice(order.totalAgorot)}
              </dd>
            </div>
          </dl>

          {order.shippingAddress && (
            <div className="mt-6 border-t border-gold/15 pt-5 text-sm">
              <h3 className="text-muted">כתובת למשלוח</h3>
              <p className="mt-1.5 text-cream">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                <br />
                {order.shippingAddress.street} {order.shippingAddress.houseNumber}
                {order.shippingAddress.apartment && `, דירה ${order.shippingAddress.apartment}`}
                <br />
                {order.shippingAddress.city}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/shop">להמשך קנייה</ButtonLink>
          <Link
            href="/account/orders"
            className="inline-flex h-11 items-center rounded-sm border border-gold/40 px-5 text-sm text-cream hover:border-gold hover:text-ivory"
          >
            להזמנות שלי
          </Link>
        </div>
      </div>
    </div>
  );
}
