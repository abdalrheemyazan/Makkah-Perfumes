import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateTimeHe } from '@/lib/utils';
import {
  DELIVERY_METHOD_LABELS,
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/commerce/labels';

export const metadata: Metadata = { title: 'פרטי הזמנה', robots: { index: false } };

type Params = Promise<{ id: string }>;

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Ownership is part of the query, not a check afterwards: another customer's
  // order id simply does not resolve.
  const order = await db.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: true,
      shippingAddress: true,
      payments: true,
      shipments: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order) notFound();

  return (
    <div className="container-editorial pt-32 pb-24">
      <Link href="/account/orders" className="text-xs text-muted hover:text-ivory">
        ← לכל ההזמנות
      </Link>

      <h1 className="ltr-nums mt-4 font-serif text-4xl text-ivory" dir="ltr">
        {order.orderNumber}
      </h1>
      <p className="mt-2 text-sm text-muted">{formatDateTimeHe(order.placedAt)}</p>

      {order.isDevelopmentOrder && (
        <p
          role="note"
          className="mt-6 rounded-sm border border-warning/50 bg-warning/10 p-4 text-sm text-warning"
        >
          הזמנה זו נוצרה במצב פיתוח. לא בוצע חיוב אמיתי ולא יישלח משלוח.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Status labelHe="סטטוס הזמנה" value={ORDER_STATUS_LABELS[order.status]} />
        <Status labelHe="תשלום" value={PAYMENT_STATUS_LABELS[order.paymentStatus]} />
        <Status labelHe="משלוח" value={FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="font-serif text-2xl text-ivory">פריטים</h2>
          <ul className="mt-5 flex flex-col divide-y divide-gold/10 border-y border-gold/10">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-4">
                <div>
                  <Link href={`/shop/${item.productSlug}`} className="text-cream hover:text-gold">
                    {item.productNameHe}
                  </Link>
                  <p className="text-xs text-faint" dir="ltr" lang="en">
                    {item.productNameEn}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.variantLabel} · <span className="ltr-nums">{item.variantSku}</span>
                  </p>
                </div>
                <div className="text-end">
                  <p className="ltr-nums text-cream">{formatPrice(item.lineTotalAgorot)}</p>
                  <p className="ltr-nums mt-1 text-xs text-faint">
                    {item.quantity} × {formatPrice(item.unitPriceAgorot)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-serif text-2xl text-ivory">היסטוריית ההזמנה</h2>
          <ol className="mt-5 flex flex-col gap-3">
            {order.events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                <div>
                  <p className="text-cream">{event.messageHe}</p>
                  <p className="text-xs text-faint">{formatDateTimeHe(event.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-sm border border-gold/15 bg-charcoal p-6">
            <h2 className="font-serif text-lg text-ivory">סיכום</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row labelHe="סכום ביניים" value={formatPrice(order.subtotalAgorot)} />
              {order.discountAgorot > 0 && (
                <Row labelHe="הנחה" value={`−${formatPrice(order.discountAgorot)}`} />
              )}
              <Row
                labelHe="משלוח"
                value={order.shippingAgorot === 0 ? 'חינם' : formatPrice(order.shippingAgorot)}
              />
              <div className="flex justify-between border-t border-gold/15 pt-3">
                <dt className="font-serif text-base text-ivory">סה״כ</dt>
                <dd className="ltr-nums font-serif text-lg text-gold">
                  {formatPrice(order.totalAgorot)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              אופן משלוח: {DELIVERY_METHOD_LABELS[order.deliveryMethod]}
            </p>
          </div>

          {order.shippingAddress && (
            <div className="rounded-sm border border-gold/15 bg-charcoal p-6 text-sm">
              <h2 className="font-serif text-lg text-ivory">כתובת למשלוח</h2>
              <p className="mt-3 leading-relaxed text-cream/85">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                <br />
                {order.shippingAddress.street} {order.shippingAddress.houseNumber}
                {order.shippingAddress.apartment && `, דירה ${order.shippingAddress.apartment}`}
                <br />
                {order.shippingAddress.city}
                {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                <br />
                <span dir="ltr">{order.shippingAddress.phone}</span>
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Status({ labelHe, value }: { labelHe: string; value: string }) {
  return (
    <div className="rounded-sm border border-gold/15 bg-charcoal p-4">
      <p className="text-xs text-muted">{labelHe}</p>
      <p className="mt-1 text-sm text-ivory">{value}</p>
    </div>
  );
}

function Row({ labelHe, value }: { labelHe: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{labelHe}</dt>
      <dd className="ltr-nums text-cream">{value}</dd>
    </div>
  );
}
