import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Heart, MapPin, Package, ShieldCheck, UserRound } from 'lucide-react';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { logout } from '@/app/actions/auth';
import { LogoutButton } from '@/components/auth/auth-forms';
import { PageIdentity } from '@/components/layout/page-identity';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/commerce/labels';

export const metadata: Metadata = { title: 'החשבון שלי', robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const isAdminUser = isAdmin(user);

  // Every figure below is a real database count — nothing is invented.
  const [recentOrders, orderCount, wishlistCount, addressCount] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: 'desc' },
      take: 4,
      include: { items: { select: { id: true } } },
    }),
    db.order.count({ where: { userId: user.id } }),
    db.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
    db.address.count({ where: { userId: user.id } }),
  ]);

  const displayName = user.firstName?.trim() || 'לקוח יקר';

  const cards = [
    {
      href: '/account/orders',
      titleHe: 'ההזמנות שלי',
      icon: Package,
      value: orderCount > 0 ? `${orderCount}` : 'אין עדיין',
      supportHe: orderCount > 0 ? 'מעקב, פרטים והיסטוריית רכישות' : 'ההזמנות שתבצעו יופיעו כאן',
    },
    {
      href: '/wishlist',
      titleHe: 'רשימת המשאלות',
      icon: Heart,
      value: wishlistCount > 0 ? `${wishlistCount}` : 'ריקה',
      supportHe: wishlistCount > 0 ? 'המוצרים ששמרתם לצפייה מאוחרת' : 'סמנו לב על מוצר כדי לשמור אותו',
    },
    {
      href: '/account/addresses',
      titleHe: 'כתובות שמורות',
      icon: MapPin,
      value: addressCount > 0 ? `${addressCount}` : 'אין עדיין',
      supportHe: addressCount > 0 ? 'כתובות למשלוח מהיר בתשלום' : 'כתובת מהתשלום תישמר כאן',
    },
    {
      href: '/account/profile',
      titleHe: 'פרטים אישיים',
      icon: UserRound,
      value: 'לצפייה',
      supportHe: 'שם, דוא״ל, טלפון והעדפות דיוור',
    },
  ] as const;

  return (
    <>
      <PageIdentity titleHe="החשבון שלי" breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'החשבון שלי' }]} />

      <div className="container-editorial pt-10 pb-24">
        <div className="mx-auto max-w-5xl">
          {/* ===== Greeting ===== */}
          <div className="flex flex-col gap-6 border-b border-gold/10 pb-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ivory sm:text-3xl">
                שלום {displayName}
              </h2>
              <p className="mt-1.5 text-sm text-muted" dir="ltr">
                {user.email}
              </p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/70">
                כאן תוכלו לנהל את ההזמנות, הכתובות, המועדפים והפרטים האישיים שלכם.
              </p>
            </div>
            <div className="shrink-0">
              <LogoutButton action={logout} />
            </div>
          </div>

          {/* ===== Summary cards ===== */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex min-h-[11.5rem] flex-col rounded-lg border border-gold/15 bg-charcoal/80 p-5 transition-colors duration-200 hover:border-gold/45 hover:bg-charcoal focus-visible:border-gold"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-ink/40 text-gold transition-colors group-hover:border-gold/50">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ivory">{card.titleHe}</h3>
                  <p className="ltr-nums mt-1 text-xl font-bold text-gold">{card.value}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{card.supportHe}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-medium text-cream/80 transition-colors group-hover:text-gold">
                    לצפייה בפרטים
                    <ArrowLeft
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}

            {/* Distinct fifth card — admins only. Store management entry point. */}
            {isAdminUser && (
              <div className="flex flex-col justify-between gap-4 rounded-lg border border-gold/45 bg-charcoal p-5 shadow-lg shadow-black/30 sm:col-span-2 lg:col-span-4 lg:flex-row lg:items-center">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/35 bg-ink/50 text-gold">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-ivory">ניהול החנות</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      מעבר ללוח הבקרה של המוצרים וההזמנות.
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-gold px-6 text-sm font-semibold text-ink transition-colors hover:bg-cream"
                >
                  פתיחת לוח הניהול
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>

          {/* ===== Recent orders ===== */}
          <section aria-labelledby="recent-orders" className="mt-14">
            <div className="flex items-center justify-between gap-4">
              <h2 id="recent-orders" className="text-xl font-semibold text-ivory sm:text-2xl">
                הזמנות אחרונות
              </h2>
              {recentOrders.length > 0 && (
                <Link
                  href="/account/orders"
                  className="inline-flex items-center gap-1.5 text-sm text-cream/80 transition-colors hover:text-gold"
                >
                  לכל ההזמנות
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            {recentOrders.length === 0 ? (
              <div className="mt-6 rounded-lg border border-gold/15 bg-charcoal/70 px-6 py-14 text-center">
                <p className="text-base font-semibold text-ivory">עדיין אין הזמנות בחשבון שלכם.</p>
                <p className="mt-2 text-sm text-muted">
                  כשתשלימו הזמנה ראשונה, היא תופיע כאן עם מעקב מלא.
                </p>
                <Link
                  href="/shop"
                  className="mt-6 inline-flex h-12 items-center gap-2 rounded-sm bg-gold px-7 text-sm font-medium text-ink transition-colors hover:bg-cream"
                >
                  לגילוי הקולקציה
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <ul className="mt-6 flex flex-col gap-3">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/15 bg-charcoal/80 p-5 transition-colors hover:border-gold/45 hover:bg-charcoal focus-visible:border-gold"
                    >
                      <div>
                        <p className="ltr-nums font-semibold text-ivory" dir="ltr">
                          {order.orderNumber}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {formatDateHe(order.placedAt)} ·{' '}
                          <span className="ltr-nums">{order.items.length}</span> פריטים
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="ltr-nums font-medium text-cream">
                          {formatPrice(order.totalAgorot)}
                        </p>
                        <p className="mt-1 text-xs text-gold">{ORDER_STATUS_LABELS[order.status]}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
