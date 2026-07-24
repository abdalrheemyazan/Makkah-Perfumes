import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, getCurrentUser, requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateTimeHe } from '@/lib/utils';
import {
  DELIVERY_METHOD_LABELS,
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/commerce/labels';
import { Badge, Card, DefinitionList, PageHeader } from '@/components/admin/ui';
import {
  OrderDangerZone,
  OrderNoteForm,
  OrderStatusForm,
} from '@/components/admin/order-actions';

export const metadata: Metadata = { title: 'פרטי הזמנה' };

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetail({ params }: { params: Params }) {
  await requireCapability('orders.read');
  const user = await getCurrentUser();
  const writable = can(user, 'orders.write');
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      shipments: true,
      events: { orderBy: { createdAt: 'asc' } },
      shippingAddress: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!order) notFound();

  return (
    <div>
      <PageHeader
        titleHe={order.orderNumber}
        descriptionHe={formatDateTimeHe(order.placedAt)}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {order.isDevelopmentOrder && <Badge tone="warning">הזמנת פיתוח</Badge>}
            <Badge tone="gold">{ORDER_STATUS_LABELS[order.status]}</Badge>
            <Link
              href={`/admin/orders/${order.id}/packing`}
              className="text-sm text-gold hover:text-cream"
            >
              תעודת ליקוט ↗
            </Link>
          </div>
        }
      />

      {order.isDevelopmentOrder && (
        <p
          role="note"
          className="mt-6 rounded-sm border border-warning/40 bg-warning/10 p-4 text-sm text-warning"
        >
          הזמנה זו נוצרה במצב תשלום פיתוח. לא בוצע חיוב אמיתי ואין לשלוח משלוח בגינה.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card titleHe="פריטים">
            <ul className="flex flex-col divide-y divide-gold/10">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/shop/${item.productSlug}`} className="text-cream hover:text-gold">
                      {item.productNameHe}
                    </Link>
                    <p className="text-xs text-faint" dir="ltr">
                      {item.productNameEn}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.variantLabel} · <span className="ltr-nums">{item.variantSku}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="ltr-nums text-cream">{formatPrice(item.lineTotalAgorot)}</p>
                    <p className="ltr-nums text-xs text-faint">
                      {item.quantity} × {formatPrice(item.unitPriceAgorot)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-5 flex flex-col gap-2 border-t border-gold/15 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">סכום ביניים</dt>
                <dd className="ltr-nums text-cream">{formatPrice(order.subtotalAgorot)}</dd>
              </div>
              {order.discountAgorot > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">
                    הנחה {order.couponCode && <span dir="ltr">({order.couponCode})</span>}
                  </dt>
                  <dd className="ltr-nums text-success">−{formatPrice(order.discountAgorot)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">משלוח</dt>
                <dd className="ltr-nums text-cream">{formatPrice(order.shippingAgorot)}</dd>
              </div>
              <div className="flex justify-between border-t border-gold/15 pt-2">
                <dt className="font-serif text-base text-ivory">סה״כ</dt>
                <dd className="ltr-nums font-serif text-lg text-gold">
                  {formatPrice(order.totalAgorot)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-faint">
              הסכומים חושבו בשרת בעת יצירת ההזמנה ואינם ניתנים לעריכה.
            </p>
          </Card>

          <Card titleHe="ציר זמן">
            <ol className="flex flex-col gap-3">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-cream">{event.messageHe}</p>
                    <p className="text-xs text-faint">{formatDateTimeHe(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {writable && (
            <Card titleHe="הערה פנימית">
              <OrderNoteForm orderId={order.id} internalNote={order.internalNote ?? ''} />
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <Card titleHe="לקוח">
            <DefinitionList
              rows={[
                {
                  labelHe: 'שם',
                  value:
                    [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') ||
                    [order.shippingAddress?.firstName, order.shippingAddress?.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                    '—',
                },
                {
                  labelHe: 'דוא״ל',
                  value: (
                    <span dir="ltr">{order.user?.email ?? order.guestEmail ?? '—'}</span>
                  ),
                },
                {
                  labelHe: 'טלפון',
                  value: (
                    <span dir="ltr">
                      {order.shippingAddress?.phone ?? order.guestPhone ?? '—'}
                    </span>
                  ),
                },
                { labelHe: 'סוג', value: order.userId ? 'לקוח רשום' : 'אורח' },
              ]}
            />
            {order.userId && (
              <Link
                href={`/admin/customers/${order.userId}`}
                className="mt-4 inline-block text-sm text-gold hover:text-cream"
              >
                לכרטיס הלקוח →
              </Link>
            )}
          </Card>

          <Card titleHe="כתובת למשלוח">
            {order.shippingAddress ? (
              <address className="text-sm leading-relaxed text-cream not-italic">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                <br />
                {order.shippingAddress.street} {order.shippingAddress.houseNumber}
                {order.shippingAddress.apartment && `, דירה ${order.shippingAddress.apartment}`}
                {order.shippingAddress.floor && `, קומה ${order.shippingAddress.floor}`}
                <br />
                {order.shippingAddress.city}
                {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                {order.shippingAddress.notes && (
                  <>
                    <br />
                    <span className="text-xs text-muted">הערה: {order.shippingAddress.notes}</span>
                  </>
                )}
              </address>
            ) : (
              <p className="text-sm text-muted">לא נשמרה כתובת.</p>
            )}
            <p className="mt-3 text-xs text-faint">
              {DELIVERY_METHOD_LABELS[order.deliveryMethod]}
            </p>
          </Card>

          <Card titleHe="תשלום">
            <DefinitionList
              rows={[
                { labelHe: 'סטטוס', value: PAYMENT_STATUS_LABELS[order.paymentStatus] },
                { labelHe: 'אספקה', value: FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus] },
                ...order.payments.map((payment) => ({
                  labelHe: payment.provider,
                  value: (
                    <span className="ltr-nums text-xs" dir="ltr">
                      {payment.providerReference ?? '—'}
                    </span>
                  ),
                })),
              ]}
            />
          </Card>

          {writable && (
            <>
              <Card titleHe="עדכון סטטוס">
                <OrderStatusForm
                  orderId={order.id}
                  status={order.status}
                  fulfillmentStatus={order.fulfillmentStatus}
                />
              </Card>

              <Card titleHe="פעולות מיוחדות">
                <OrderDangerZone
                  orderId={order.id}
                  canCancel={order.status !== 'CANCELLED' && order.fulfillmentStatus !== 'FULFILLED'}
                  canRefund={order.paymentStatus === 'PAID'}
                  isDevelopmentOrder={order.isDevelopmentOrder}
                />
              </Card>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
