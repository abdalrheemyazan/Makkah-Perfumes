import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/commerce/labels';
import {
  AdminButtonLink,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from '@/components/admin/ui';

export const metadata: Metadata = { title: 'לוח בקרה' };

/** Orders that represent real committed revenue. Cancelled/refunded excluded. */
const REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export default async function AdminDashboard() {
  await requireCapability('orders.read');

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    ordersToday,
    revenueAgg,
    revenueTodayAgg,
    revenueMonthAgg,
    pendingOrders,
    unreadMessages,
    outOfStockCount,
    draftProductCount,
    lowStock,
    topSellers,
    recentCustomers,
    couponUsage,
    newsletterCount,
    devOrderCount,
  ] = await Promise.all([
    db.order.count({ where: { placedAt: { gte: startOfToday } } }),
    db.order.aggregate({
      where: { status: { in: [...REVENUE_STATUSES] } },
      _sum: { totalAgorot: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { status: { in: [...REVENUE_STATUSES] }, placedAt: { gte: startOfToday } },
      _sum: { totalAgorot: true },
    }),
    db.order.aggregate({
      where: { status: { in: [...REVENUE_STATUSES] }, placedAt: { gte: startOfMonth } },
      _sum: { totalAgorot: true },
    }),
    db.order.count({ where: { status: 'PENDING' } }),
    db.contactMessage.count({ where: { status: 'NEW' } }),
    db.inventoryItem.count({ where: { quantityOnHand: { lte: 0 } } }),
    db.product.count({ where: { status: 'DRAFT' } }),
    db.inventoryItem.findMany({
      where: { quantityOnHand: { lte: 5 } },
      include: { variant: { include: { product: true } } },
      orderBy: { quantityOnHand: 'asc' },
      take: 6,
    }),
    db.orderItem.groupBy({
      by: ['productSlug', 'productNameHe'],
      _sum: { quantity: true, lineTotalAgorot: true },
      where: { order: { status: { in: [...REVENUE_STATUSES] } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    }),
    db.couponRedemption.groupBy({
      by: ['couponId'],
      _count: true,
      _sum: { discountAgorot: true },
      orderBy: { _count: { couponId: 'desc' } },
      take: 5,
    }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    db.order.count({ where: { isDevelopmentOrder: true } }),
  ]);

  const revenue = revenueAgg._sum.totalAgorot ?? 0;
  const orderCount = revenueAgg._count;
  const revenueToday = revenueTodayAgg._sum.totalAgorot ?? 0;
  const revenueMonth = revenueMonthAgg._sum.totalAgorot ?? 0;
  // Guard the division: an empty shop must show a dash, not NaN.
  const averageOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : null;

  const couponIds = couponUsage.map((row) => row.couponId);
  const coupons = couponIds.length
    ? await db.coupon.findMany({ where: { id: { in: couponIds } }, select: { id: true, code: true } })
    : [];
  const couponCodes = new Map(coupons.map((coupon) => [coupon.id, coupon.code]));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        titleHe="לוח בקרה"
        descriptionHe="כל הנתונים בעמוד זה מחושבים ישירות מבסיס הנתונים. אין כאן ערכים מודגמים."
      />

      {devOrderCount > 0 && (
        <p
          role="note"
          className="rounded-sm border border-warning/40 bg-warning/10 p-4 text-sm text-warning"
        >
          <span className="ltr-nums">{devOrderCount}</span> מתוך ההזמנות נוצרו במצב תשלום
          פיתוח ואינן מייצגות הכנסה אמיתית.
        </p>
      )}

      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">
          מדדים
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard labelHe="הזמנות היום" value={String(ordersToday)} />
          <StatCard labelHe="הכנסות היום" value={formatPrice(revenueToday)} />
          <StatCard labelHe="הכנסות החודש" value={formatPrice(revenueMonth)} />
          <StatCard
            labelHe="הכנסות (מצטבר)"
            value={formatPrice(revenue)}
            hintHe={`מתוך ${orderCount} הזמנות שאושרו`}
          />
          <StatCard
            labelHe="ערך הזמנה ממוצע"
            value={averageOrderValue === null ? '—' : formatPrice(averageOrderValue)}
            hintHe={averageOrderValue === null ? 'אין עדיין הזמנות' : undefined}
          />
          <StatCard
            labelHe="הזמנות ממתינות"
            value={String(pendingOrders)}
            tone={pendingOrders > 0 ? 'warning' : 'default'}
          />
          <StatCard
            labelHe="הודעות חדשות"
            value={String(unreadMessages)}
            tone={unreadMessages > 0 ? 'warning' : 'default'}
            hintHe={unreadMessages > 0 ? 'ממתינות לטיפול' : undefined}
          />
          <StatCard
            labelHe="אזל מהמלאי"
            value={String(outOfStockCount)}
            tone={outOfStockCount > 0 ? 'warning' : 'default'}
          />
          <StatCard
            labelHe="מוצרים בטיוטה"
            value={String(draftProductCount)}
            hintHe={draftProductCount > 0 ? 'טרם פורסמו' : undefined}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low stock */}
        <Card titleHe="מוצרים במלאי נמוך" descriptionHe="עד 5 יחידות במלאי">
          {lowStock.length === 0 ? (
            <EmptyState titleHe="אין מוצרים במלאי נמוך" />
          ) : (
            <ul className="flex flex-col gap-3">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    href={`/admin/products/${item.variant.productId}`}
                    className="min-w-0 truncate text-cream hover:text-gold"
                  >
                    {item.variant.product.nameHe}
                  </Link>
                  <Badge tone={item.quantityOnHand === 0 ? 'danger' : 'warning'}>
                    <span className="ltr-nums">{item.quantityOnHand}</span> במלאי
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5">
            <AdminButtonLink href="/admin/inventory" variant="secondary">
              לניהול המלאי
            </AdminButtonLink>
          </div>
        </Card>

        {/* Top products */}
        <Card titleHe="מוצרים מובילים" descriptionHe="לפי כמות שנמכרה בהזמנות שאושרו">
          {topSellers.length === 0 ? (
            <EmptyState
              titleHe="עדיין אין נתוני מכירות"
              descriptionHe="הרשימה תתמלא לאחר ההזמנה הראשונה."
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {topSellers.map((row, index) => (
                <li key={row.productSlug} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="ltr-nums me-2 text-faint">{index + 1}.</span>
                    <Link href={`/shop/${row.productSlug}`} className="text-cream hover:text-gold">
                      {row.productNameHe}
                    </Link>
                  </span>
                  <span className="ltr-nums shrink-0 text-muted">
                    {row._sum.quantity ?? 0} יח׳ · {formatPrice(row._sum.lineTotalAgorot ?? 0)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Recent customers */}
        <Card titleHe="לקוחות אחרונים">
          {recentCustomers.length === 0 ? (
            <EmptyState titleHe="אין עדיין לקוחות רשומים" />
          ) : (
            <ul className="flex flex-col gap-3">
              {recentCustomers.map((customer) => (
                <li key={customer.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-cream">
                    {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'}
                    <span className="block truncate text-xs text-faint" dir="ltr">
                      {customer.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDateHe(customer.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5">
            <AdminButtonLink href="/admin/customers" variant="secondary">
              לכל הלקוחות
            </AdminButtonLink>
          </div>
        </Card>

        {/* Coupons + newsletter */}
        <Card titleHe="קופונים וניוזלטר">
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm text-cream">שימוש בקופונים</h3>
              {couponUsage.length === 0 ? (
                <p className="mt-2 text-sm text-muted">עדיין לא מומשו קופונים.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {couponUsage.map((row) => (
                    <li key={row.couponId} className="flex justify-between gap-3 text-sm">
                      <span className="text-cream" dir="ltr">
                        {couponCodes.get(row.couponId) ?? '—'}
                      </span>
                      <span className="ltr-nums text-muted">
                        {row._count} מימושים · {formatPrice(row._sum.discountAgorot ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-gold/10 pt-4">
              <h3 className="text-sm text-cream">הרשמות לניוזלטר</h3>
              <p className="ltr-nums mt-2 font-serif text-2xl text-ivory">{newsletterCount}</p>
              <p className="mt-1 text-xs text-faint">נרשמים פעילים</p>
            </div>
          </div>
        </Card>
      </div>

      <RecentOrders />
    </div>
  );
}

async function RecentOrders() {
  const orders = await db.order.findMany({
    orderBy: { placedAt: 'desc' },
    take: 8,
    include: { items: { select: { id: true } } },
  });

  return (
    <Card titleHe="הזמנות אחרונות">
      {orders.length === 0 ? (
        <EmptyState
          titleHe="אין עדיין הזמנות"
          descriptionHe="ההזמנה הראשונה תופיע כאן מיד לאחר ביצועה."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-gold/10">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="ltr-nums text-sm text-ivory hover:text-gold"
                  dir="ltr"
                >
                  {order.orderNumber}
                </Link>
                <p className="mt-0.5 text-xs text-faint">
                  {formatDateHe(order.placedAt)} · {order.items.length} פריטים
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {order.isDevelopmentOrder && <Badge tone="warning">פיתוח</Badge>}
                <Badge tone={order.status === 'PENDING' ? 'warning' : 'gold'}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <span className="ltr-nums text-sm text-cream">
                  {formatPrice(order.totalAgorot)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5">
        <AdminButtonLink href="/admin/orders" variant="secondary">
          לכל ההזמנות
        </AdminButtonLink>
      </div>
    </Card>
  );
}
