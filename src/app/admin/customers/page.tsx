import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'לקוחות' };

const PAID_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

type SearchParams = Promise<{ q?: string }>;

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability('customers.read');
  const { q } = await searchParams;

  const customers = await db.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      orders: { select: { totalAgorot: true, status: true } },
      _count: { select: { orders: true } },
    },
  });

  return (
    <div>
      <PageHeader titleHe="לקוחות" descriptionHe={`${customers.length} לקוחות רשומים`} />

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs text-muted">
            חיפוש
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="שם או דוא״ל"
            className="mt-1 h-10 w-56 rounded-sm border border-gold/25 bg-ink px-3 text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="h-10 rounded-sm border border-gold/40 px-4 text-sm text-cream hover:border-gold"
        >
          סינון
        </button>
        {q && (
          <Link href="/admin/customers" className="text-sm text-muted hover:text-ivory">
            ניקוי
          </Link>
        )}
      </form>

      {customers.length === 0 ? (
        <div className="mt-8">
          <EmptyState titleHe="לא נמצאו לקוחות" />
        </div>
      ) : (
        <Table headers={['שם', 'דוא״ל', 'הזמנות', 'סה״כ רכישות', 'נרשם']}>
          {customers.map((customer) => {
            const spend = customer.orders
              .filter((order) => PAID_STATUSES.includes(order.status))
              .reduce((sum, order) => sum + order.totalAgorot, 0);

            return (
              <Row key={customer.id}>
                <Cell labelHe="שם">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="text-ivory hover:text-gold"
                  >
                    {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'}
                  </Link>
                </Cell>
                <Cell labelHe="דוא״ל">
                  <span className="text-xs" dir="ltr">
                    {customer.email}
                  </span>
                </Cell>
                <Cell labelHe="הזמנות">
                  <span className="ltr-nums">{customer._count.orders}</span>
                </Cell>
                <Cell labelHe="סה״כ רכישות">
                  <span className="ltr-nums">{formatPrice(spend)}</span>
                </Cell>
                <Cell labelHe="נרשם">
                  <span className="text-xs text-muted">{formatDateHe(customer.createdAt)}</span>
                </Cell>
              </Row>
            );
          })}
        </Table>
      )}
    </div>
  );
}
