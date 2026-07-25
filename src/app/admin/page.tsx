import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  ScrollText,
  ShoppingBag,
  Sparkles,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react';
import { ADMIN_ROLES, requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/commerce/labels';
import { ROLE_LABELS } from '@/lib/admin/labels';
import { Badge } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'לוח בקרה' };

/**
 * Store dashboard.
 *
 * Deliberately store-focused: product, order, inventory and customer counts,
 * recent orders and low-stock — all computed live from Postgres. No revenue
 * charts, no newsletter/content metrics, nothing fabricated. Every "status"
 * word under a KPI is derived from the real count next to it, never invented.
 *
 * This is a presentation layer only: the queries, links, permissions and the
 * numbers themselves are unchanged from the original dashboard — only the
 * layout, hierarchy and styling were refined.
 */
export default async function AdminDashboard() {
  const user = await requireCapability('orders.read');

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

  const firstName = user.firstName?.trim();
  const primaryRole = ADMIN_ROLES.find((role) => user.roles.includes(role));
  const roleHe = primaryRole ? ROLE_LABELS[primaryRole] : null;
  const activeOrders = newOrders + inProgressOrders;

  return (
    <div className="flex flex-col gap-10">
      {/* ===== Hero header ===== */}
      <section className="relative overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-bl from-charcoal-soft via-charcoal to-ink px-6 py-7 sm:px-8 sm:py-8">
        {/* Warm gold glow in the inline-end/top corner (right in RTL). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 end-[-6rem] h-64 w-64 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-gold) 26%, transparent) 0%, transparent 70%)',
          }}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs tracking-wide text-gold/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {firstName ? `שלום, ${firstName}` : 'שלום'}
              {roleHe && <span className="text-faint">· {roleHe}</span>}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-ivory sm:text-4xl">לוח בקרה</h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted">
              מרכז הבקרה של החנות — מוצרים, הזמנות, מלאי ולקוחות במבט אחד. כל הנתונים
              מחושבים בזמן אמת ישירות מבסיס הנתונים.
            </p>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-gold/40 bg-ink/40 px-5 text-sm font-medium text-cream transition-colors duration-200 hover:border-gold hover:bg-gold/10 hover:text-ivory"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            צפייה בחנות
          </a>
        </div>

        {/* Summary chips */}
        <div className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryChip icon={Package} labelHe="סך מוצרים" value={totalProducts} />
          <SummaryChip icon={ShoppingBag} labelHe="הזמנות פעילות" value={activeOrders} />
          <SummaryChip icon={Users} labelHe="לקוחות" value={customerCount} />
          <SummaryChip
            icon={Warehouse}
            labelHe="מלאי נמוך"
            value={lowStock + outOfStock}
            tone={lowStock + outOfStock > 0 ? 'warning' : 'default'}
          />
        </div>
      </section>

      {/* ===== Quick actions ===== */}
      <section aria-labelledby="quick-actions">
        <SectionHeading id="quick-actions" titleHe="פעולות מהירות" />
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickAction
            href="/admin/products/new"
            icon={PackagePlus}
            labelHe="הוספת מוצר"
            helperHe="יצירת מוצר חדש עם וריאנט ומלאי"
          />
          <QuickAction
            href="/admin/orders"
            icon={ScrollText}
            labelHe="צפייה בהזמנות"
            helperHe="ניהול, מעקב ועדכון סטטוס הזמנות"
          />
          <QuickAction
            href="/admin/inventory"
            icon={Warehouse}
            labelHe="עדכון מלאי"
            helperHe="בקרת כמויות והתראות מלאי נמוך"
          />
        </div>
      </section>

      {/* ===== Product KPIs ===== */}
      <section aria-labelledby="product-kpis">
        <SectionHeading id="product-kpis" titleHe="מוצרים" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={Boxes} labelHe="סך כל המוצרים" value={totalProducts} tone="gold" />
          <Kpi
            icon={PackageCheck}
            labelHe="מוצרים פעילים"
            value={activeProducts}
            tone="success"
            statusHe={`${activeProducts} מתוך ${totalProducts} מפורסמים`}
          />
          <Kpi
            icon={PackageX}
            labelHe="אזלו מהמלאי"
            value={outOfStock}
            tone={outOfStock > 0 ? 'danger' : 'success'}
            statusHe={outOfStock > 0 ? 'דורש חידוש מלאי' : 'אין מוצרים שאזלו'}
          />
          <Kpi
            icon={Warehouse}
            labelHe="במלאי נמוך"
            value={lowStock}
            tone={lowStock > 0 ? 'warning' : 'success'}
            statusHe={lowStock > 0 ? 'עד 5 יחידות' : 'המלאי תקין'}
          />
        </div>
      </section>

      {/* ===== Order + customer KPIs ===== */}
      <section aria-labelledby="order-kpis">
        <SectionHeading id="order-kpis" titleHe="הזמנות ולקוחות" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={Clock}
            labelHe="הזמנות חדשות"
            value={newOrders}
            tone={newOrders > 0 ? 'warning' : 'default'}
            statusHe={newOrders > 0 ? 'ממתינות לטיפול' : 'אין ממתינות'}
          />
          <Kpi
            icon={ScrollText}
            labelHe="הזמנות בטיפול"
            value={inProgressOrders}
            tone="default"
          />
          <Kpi
            icon={CheckCircle2}
            labelHe="הזמנות שהושלמו"
            value={completedOrders}
            tone="success"
          />
          <Kpi icon={UserRound} labelHe="מספר לקוחות" value={customerCount} tone="gold" />
        </div>
      </section>

      {/* ===== Lower panels ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Panel
          titleHe="הזמנות אחרונות"
          subtitleHe={recentOrders.length > 0 ? `${recentOrders.length} ההזמנות האחרונות` : undefined}
          cta={{ href: '/admin/orders', labelHe: 'לכל ההזמנות' }}
        >
          {recentOrders.length === 0 ? (
            <PanelEmpty
              icon={ShoppingBag}
              titleHe="אין עדיין הזמנות"
              descriptionHe="ההזמנה הראשונה תופיע כאן מיד לאחר ביצועה."
              cta={{ href: '/admin/orders', labelHe: 'למסך ההזמנות' }}
            />
          ) : (
            <ul className="flex flex-col">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="group flex items-center justify-between gap-3 rounded-md px-3 py-3 transition-colors hover:bg-stone/40"
                  >
                    <div className="min-w-0">
                      <span
                        dir="ltr"
                        className="ltr-nums block text-sm font-medium text-ivory transition-colors group-hover:text-gold"
                      >
                        {order.orderNumber}
                      </span>
                      <p className="mt-0.5 text-xs text-faint">
                        {formatDateHe(order.placedAt)} ·{' '}
                        <span className="ltr-nums">{order.items.length}</span> פריטים
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="ltr-nums text-sm text-cream">
                        {formatPrice(order.totalAgorot)}
                      </span>
                      <Badge tone={order.status === 'PENDING' ? 'warning' : 'gold'}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Low stock */}
        <Panel
          titleHe="מוצרים במלאי נמוך"
          subtitleHe="עד 5 יחידות במלאי"
          cta={{ href: '/admin/inventory', labelHe: 'לניהול המלאי' }}
        >
          {lowStockItems.length === 0 ? (
            <PanelEmpty
              icon={PackageCheck}
              tone="success"
              titleHe="כל המלאי תקין"
              descriptionHe="אין כרגע מוצרים שירדו מתחת לסף המלאי הנמוך."
              cta={{ href: '/admin/inventory', labelHe: 'למסך המלאי' }}
            />
          ) : (
            <ul className="flex flex-col">
              {lowStockItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/admin/products/${item.variant.productId}`}
                    className="group flex items-center justify-between gap-3 rounded-md px-3 py-3 transition-colors hover:bg-stone/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-md border',
                          item.quantityOnHand === 0
                            ? 'border-danger/30 bg-danger/10 text-danger'
                            : 'border-warning/30 bg-warning/10 text-warning',
                        )}
                        aria-hidden="true"
                      >
                        <Package className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 truncate text-sm text-cream transition-colors group-hover:text-gold">
                        {item.variant.product.nameHe}
                      </span>
                    </div>
                    <Badge tone={item.quantityOnHand === 0 ? 'danger' : 'warning'}>
                      <span className="ltr-nums">{item.quantityOnHand}</span> במלאי
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational building blocks (dashboard-local)                    */
/* ------------------------------------------------------------------ */

type IconType = typeof Package;

function SectionHeading({ id, titleHe }: { id: string; titleHe: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 id={id} className="text-sm font-semibold tracking-wide text-gold">
        {titleHe}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/20" />
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  labelHe,
  value,
  tone = 'default',
}: {
  icon: IconType;
  labelHe: string;
  value: number;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gold/12 bg-ink/40 px-4 py-3">
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-md border',
          tone === 'warning'
            ? 'border-warning/30 bg-warning/10 text-warning'
            : 'border-gold/25 bg-gold/10 text-gold',
        )}
        aria-hidden="true"
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.7rem] text-muted">{labelHe}</p>
        <p className="ltr-nums text-lg font-semibold text-ivory">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  labelHe,
  helperHe,
}: {
  href: string;
  icon: IconType;
  labelHe: string;
  helperHe: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[6rem] items-center gap-4 rounded-xl border border-gold/20 bg-charcoal p-5 transition-[transform,border-color,background-color,box-shadow] duration-200 hover:border-gold/45 hover:bg-charcoal-soft hover:shadow-lg hover:shadow-black/30 motion-safe:hover:-translate-y-0.5"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-gold/25 bg-ink/60 text-gold transition-colors duration-200 group-hover:border-gold/50 group-hover:bg-gold/15">
        <Icon className="h-5.5 w-5.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ivory">{labelHe}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{helperHe}</p>
      </div>
      <ArrowLeft
        className="h-4 w-4 shrink-0 text-faint transition-[transform,color] duration-200 group-hover:text-gold motion-safe:group-hover:-translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}

const KPI_TONES = {
  default: { value: 'text-ivory', icon: 'border-gold/20 bg-gold/5 text-gold/80', accent: 'bg-gold/25', status: 'text-faint' },
  gold: { value: 'text-gold', icon: 'border-gold/25 bg-gold/10 text-gold', accent: 'bg-gold/50', status: 'text-faint' },
  success: { value: 'text-success', icon: 'border-success/25 bg-success/10 text-success', accent: 'bg-success/50', status: 'text-success/80' },
  warning: { value: 'text-warning', icon: 'border-warning/25 bg-warning/10 text-warning', accent: 'bg-warning/50', status: 'text-warning/80' },
  danger: { value: 'text-danger', icon: 'border-danger/25 bg-danger/10 text-danger', accent: 'bg-danger/50', status: 'text-danger/80' },
} as const;

function Kpi({
  icon: Icon,
  labelHe,
  value,
  tone = 'default',
  statusHe,
}: {
  icon: IconType;
  labelHe: string;
  value: number;
  tone?: keyof typeof KPI_TONES;
  statusHe?: string;
}) {
  const styles = KPI_TONES[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/15 bg-charcoal p-5 transition-colors duration-200 hover:border-gold/30">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted">{labelHe}</p>
        <span
          className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md border', styles.icon)}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn('ltr-nums mt-3 text-4xl font-bold tracking-tight', styles.value)}>{value}</p>
      {statusHe && <p className={cn('mt-1.5 text-[0.7rem]', styles.status)}>{statusHe}</p>}
      <span aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 h-0.5', styles.accent)} />
    </div>
  );
}

type PanelCta = { href: string; labelHe: string };

function Panel({
  titleHe,
  subtitleHe,
  cta,
  children,
}: {
  titleHe: string;
  subtitleHe?: string;
  cta: PanelCta;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-gold/15 bg-charcoal">
      <header className="flex items-center justify-between gap-3 border-b border-gold/10 px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ivory">{titleHe}</h2>
          {subtitleHe && <p className="mt-0.5 text-xs text-muted">{subtitleHe}</p>}
        </div>
        <Link
          href={cta.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-cream"
        >
          {cta.labelHe}
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform duration-200 motion-safe:group-hover:-translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </header>
      <div className="flex-1 p-3 sm:p-4">{children}</div>
    </section>
  );
}

function PanelEmpty({
  icon: Icon,
  titleHe,
  descriptionHe,
  cta,
  tone = 'default',
}: {
  icon: IconType;
  titleHe: string;
  descriptionHe: string;
  cta: PanelCta;
  tone?: 'default' | 'success';
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span
        className={cn(
          'grid h-14 w-14 place-items-center rounded-full border',
          tone === 'success'
            ? 'border-success/25 bg-success/10 text-success'
            : 'border-gold/20 bg-gold/5 text-gold/80',
        )}
        aria-hidden="true"
      >
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-base font-semibold text-ivory">{titleHe}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{descriptionHe}</p>
      </div>
      <Link
        href={cta.href}
        className="mt-1 inline-flex h-9 items-center rounded-md border border-gold/40 px-4 text-sm text-cream transition-colors hover:border-gold hover:bg-gold/10 hover:text-ivory"
      >
        {cta.labelHe}
      </Link>
    </div>
  );
}
