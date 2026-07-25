import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, Package, PackagePlus, ScrollText, Warehouse } from 'lucide-react';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/commerce/labels';
import { AdminButtonLink, Badge, Card, EmptyState, PageHeader, StatCard } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'לוח בקרה' };

/**
 * Store dashboard.
 *
 * Deliberately store-focused: product, order, inventory and customer counts,
 * recent orders and low-stock — all computed live from Postgres. No revenue
 * charts, no newsletter/content metrics, nothing fabricated.
 */
export default async function AdminDashboard() {
  await requireCapability('orders.read');

  const [
    totalProducts,
    activeProducts,
    outOfStock,
    lowStock,
    newOrders,
    inProgressOrders,
    completedOrders,
    customerCount,
    lowStockItems,
    recentOrders,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: 'PUBLISHED' } }),
    db.inventoryItem.count({ where: { quantityOnHand: { lte: 0 } } }),
    db.inventoryItem.count({ where: { quantityOnHand: { gt: 0, lte: 5 } } }),
    db.order.count({ where: { status: 'PENDING' } }),
    db.order.count({ where: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] } } }),
    db.order.count({ where: { status: 'DELIVERED' } }),
    db.user.count(),
    db.inventoryItem.findMany({
      where: { quantityOnHand: { lte: 5 } },
      include: { variant: { include: { product: true } } },
      orderBy: { quantityOnHand: 'asc' },
      take: 6,
    }),
    db.order.findMany({
      orderBy: { placedAt: 'desc' },
      take: 6,
      include: { items: { select: { id: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        titleHe="לוח בקרה"
        descriptionHe="סקירת החנות — מוצרים, הזמנות, מלאי ולקוחות. כל הנתונים מחושבים ישירות מבסיס הנתונים."
        action={
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-gold/40 px-4 text-sm font-medium text-cream transition-colors hover:border-gold hover:text-ivory"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            צפייה בחנות
          </a>
        }
      />

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction href="/admin/products/new" icon={PackagePlus} labelHe="הוספת מוצר" />
        <QuickAction href="/admin/orders" icon={ScrollText} labelHe="צפייה בהזמנות" />
        <QuickAction href="/admin/inventory" icon={Warehouse} labelHe="עדכון מלאי" />
      </div>

      {/* Product metrics */}
      <section aria-labelledby="product-kpis">
        <h2 id="product-kpis" className="mb-3 text-sm font-medium text-gold">מוצרים</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard labelHe="סך כל המוצרים" value={String(totalProducts)} />
          <StatCard labelHe="מוצרים פעילים" value={String(activeProducts)} tone="success" />
          <StatCard
            labelHe="אזלו מהמלאי"
            value={String(outOfStock)}
            tone={outOfStock > 0 ? 'warning' : 'default'}
          />
          <StatCard
            labelHe="במלאי נמוך"
            value={String(lowStock)}
            tone={lowStock > 0 ? 'warning' : 'default'}
          />
        </div>
      </section>

      {/* Order + customer metrics */}
      <section aria-labelledby="order-kpis">
        <h2 id="order-kpis" className="mb-3 text-sm font-medium text-gold">הזמנות ולקוחות</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            labelHe="הזמנות חדשות"
            value={String(newOrders)}
            tone={newOrders > 0 ? 'warning' : 'default'}
          />
          <StatCard labelHe="הזמנות בטיפול" value={String(inProgressOrders)} />
          <StatCard labelHe="הזמנות שהושלמו" value={String(completedOrders)} tone="success" />
          <StatCard labelHe="מספר לקוחות" value={String(customerCount)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Card titleHe="הזמנות אחרונות">
          {recentOrders.length === 0 ? (
            <EmptyState
              titleHe="אין עדיין הזמנות"
              descriptionHe="ההזמנה הראשונה תופיע כאן מיד לאחר ביצועה."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-gold/10">
              {recentOrders.map((order) => (
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
                      {formatDateHe(order.placedAt)} · <span className="ltr-nums">{order.items.length}</span> פריטים
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={order.status === 'PENDING' ? 'warning' : 'gold'}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <span className="ltr-nums text-sm text-cream">{formatPrice(order.totalAgorot)}</span>
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

        {/* Low stock */}
        <Card titleHe="מוצרים במלאי נמוך" descriptionHe="עד 5 יחידות במלאי">
          {lowStockItems.length === 0 ? (
            <EmptyState titleHe="אין מוצרים במלאי נמוך" />
          ) : (
            <ul className="flex flex-col gap-3">
              {lowStockItems.map((item) => (
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
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  labelHe,
}: {
  href: string;
  icon: typeof Package;
  labelHe: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-sm border border-gold/20 bg-charcoal p-4 text-sm font-medium text-cream transition-colors hover:border-gold/50 hover:text-ivory"
    >
      <span className="grid h-10 w-10 place-items-center rounded-sm border border-gold/25 bg-ink/50 text-gold">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      {labelHe}
    </Link>
  );
}
