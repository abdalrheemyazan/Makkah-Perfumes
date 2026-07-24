import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe, formatDateTimeHe } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/commerce/labels';
import { ROLE_LABELS } from '@/lib/admin/labels';
import { Badge, Card, DefinitionList, EmptyState, PageHeader } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'כרטיס לקוח' };

const PAID_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

type Params = Promise<{ id: string }>;

export default async function AdminCustomerDetail({ params }: { params: Params }) {
  await requireCapability('customers.read');
  const { id } = await params;

  const customer = await db.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
      addresses: true,
      orders: { orderBy: { placedAt: 'desc' }, include: { items: { select: { id: true } } } },
    },
  });
  if (!customer) notFound();

  const spend = customer.orders
    .filter((order) => PAID_STATUSES.includes(order.status))
    .reduce((sum, order) => sum + order.totalAgorot, 0);

  return (
    <div>
      <PageHeader
        titleHe={
          [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email
        }
        descriptionHe={customer.email}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Card titleHe="הזמנות">
          {customer.orders.length === 0 ? (
            <EmptyState titleHe="אין הזמנות ללקוח זה" />
          ) : (
            <ul className="flex flex-col divide-y divide-gold/10">
              {customer.orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="ltr-nums text-sm text-ivory hover:text-gold"
                      dir="ltr"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-faint">
                      {formatDateHe(order.placedAt)} · {order.items.length} פריטים
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="gold">{ORDER_STATUS_LABELS[order.status]}</Badge>
                    <span className="ltr-nums text-sm text-cream">
                      {formatPrice(order.totalAgorot)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <aside className="flex flex-col gap-6">
          <Card titleHe="פרטים">
            <DefinitionList
              rows={[
                { labelHe: 'דוא״ל', value: <span dir="ltr">{customer.email}</span> },
                { labelHe: 'טלפון', value: <span dir="ltr">{customer.phone ?? '—'}</span> },
                { labelHe: 'נרשם', value: formatDateTimeHe(customer.createdAt) },
                { labelHe: 'דיוור', value: customer.acceptsMarketing ? 'מנוי' : 'לא מנוי' },
                { labelHe: 'סטטוס', value: customer.isActive ? 'פעיל' : 'מושבת' },
                {
                  labelHe: 'סה״כ רכישות',
                  value: <span className="ltr-nums">{formatPrice(spend)}</span>,
                },
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {customer.roles.map((assignment) => (
                <Badge key={assignment.roleId} tone="neutral">
                  {ROLE_LABELS[assignment.role.name] ?? assignment.role.name}
                </Badge>
              ))}
            </div>
            {customer.deletionRequestedAt && (
              <p className="mt-4 rounded-sm border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
                הלקוח ביקש מחיקת חשבון בתאריך {formatDateHe(customer.deletionRequestedAt)}.
              </p>
            )}
          </Card>

          <Card titleHe="כתובות">
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-muted">לא נשמרו כתובות.</p>
            ) : (
              <ul className="flex flex-col gap-4 text-sm">
                {customer.addresses.map((address) => (
                  <li key={address.id} className="leading-relaxed text-cream">
                    {address.street} {address.houseNumber}
                    {address.apartment && `, דירה ${address.apartment}`}
                    <br />
                    {address.city}
                    {address.postalCode && ` ${address.postalCode}`}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
