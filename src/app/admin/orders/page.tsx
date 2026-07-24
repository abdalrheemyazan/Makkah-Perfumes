import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import type { OrderStatus } from '@/generated/prisma/enums';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateTimeHe } from '@/lib/utils';
import {
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/commerce/labels';
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'הזמנות' };

const PAGE_SIZE = 25;

/** Narrows an untrusted URL value to a real OrderStatus. */
function isOrderStatus(value: string): value is OrderStatus {
  return value in ORDER_STATUS_LABELS;
}

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability('orders.read');
  const { q, status, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status && isOrderStatus(status) ? { status } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' as const } },
            { guestEmail: { contains: q, mode: 'insensitive' as const } },
            { user: { email: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        items: { select: { id: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader titleHe="הזמנות" descriptionHe={`${total} הזמנות`} />

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs text-muted">
            חיפוש
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="מספר הזמנה או דוא״ל"
            className="mt-1 h-10 w-56 rounded-sm border border-gold/25 bg-ink px-3 text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs text-muted">
            סטטוס
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="mt-1 h-10 rounded-sm border border-gold/25 bg-ink px-3 text-sm text-cream focus:border-gold focus:outline-none"
          >
            <option value="">הכול</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, labelHe]) => (
              <option key={value} value={value}>
                {labelHe}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-sm border border-gold/40 px-4 text-sm text-cream hover:border-gold"
        >
          סינון
        </button>
        {(q || status) && (
          <Link href="/admin/orders" className="text-sm text-muted hover:text-ivory">
            ניקוי
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="לא נמצאו הזמנות"
            descriptionHe={q || status ? 'נסו לשנות את הסינון.' : 'ההזמנה הראשונה תופיע כאן.'}
          />
        </div>
      ) : (
        <>
          <Table headers={['מספר', 'תאריך', 'לקוח', 'סכום', 'תשלום', 'אספקה', 'סטטוס']}>
            {orders.map((order) => (
              <Row key={order.id}>
                <Cell labelHe="מספר">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="ltr-nums text-ivory hover:text-gold"
                    dir="ltr"
                  >
                    {order.orderNumber}
                  </Link>
                  {order.isDevelopmentOrder && (
                    <span className="ms-2">
                      <Badge tone="warning">פיתוח</Badge>
                    </span>
                  )}
                </Cell>
                <Cell labelHe="תאריך">
                  <span className="text-xs text-muted">{formatDateTimeHe(order.placedAt)}</span>
                </Cell>
                <Cell labelHe="לקוח">
                  <span className="block truncate text-xs" dir="ltr">
                    {order.user?.email ?? order.guestEmail ?? '—'}
                  </span>
                </Cell>
                <Cell labelHe="סכום">
                  <span className="ltr-nums">{formatPrice(order.totalAgorot)}</span>
                </Cell>
                <Cell labelHe="תשלום">
                  <Badge tone={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </Badge>
                </Cell>
                <Cell labelHe="אספקה">
                  <Badge tone={order.fulfillmentStatus === 'FULFILLED' ? 'success' : 'neutral'}>
                    {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
                  </Badge>
                </Cell>
                <Cell labelHe="סטטוס">
                  <Badge
                    tone={
                      order.status === 'CANCELLED' || order.status === 'REFUNDED'
                        ? 'danger'
                        : order.status === 'PENDING'
                          ? 'warning'
                          : 'gold'
                    }
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </Cell>
              </Row>
            ))}
          </Table>

          {pageCount > 1 && (
            <nav aria-label="ניווט בין עמודים" className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                if (status) params.set('status', status);
                if (number > 1) params.set('page', String(number));
                const query = params.toString();
                return (
                  <Link
                    key={number}
                    href={query ? `/admin/orders?${query}` : '/admin/orders'}
                    aria-current={number === page ? 'page' : undefined}
                    className={
                      number === page
                        ? 'ltr-nums grid h-9 w-9 place-items-center rounded-sm bg-gold text-sm text-ink'
                        : 'ltr-nums grid h-9 w-9 place-items-center rounded-sm border border-gold/25 text-sm text-cream hover:border-gold'
                    }
                  >
                    {number}
                  </Link>
                );
              })}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
