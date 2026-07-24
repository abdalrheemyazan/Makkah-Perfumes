import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logout } from '@/app/actions/auth';
import { LogoutButton } from '@/components/auth/auth-forms';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/commerce/labels';

export const metadata: Metadata = { title: 'החשבון שלי', robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [orders, wishlistCount] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: 'desc' },
      take: 3,
      include: { items: { select: { id: true } } },
    }),
    db.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
  ]);

  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-ivory">
            שלום {user.firstName ?? ''}
          </h1>
          <p className="mt-2 text-sm text-muted" dir="ltr">
            {user.email}
          </p>
        </div>
        <LogoutButton action={logout} />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <Tile href="/account/orders" titleHe="ההזמנות שלי" value={String(orders.length)} />
        <Tile href="/wishlist" titleHe="רשימת משאלות" value={String(wishlistCount)} />
        <Tile href="/account/addresses" titleHe="כתובות" value="ניהול" />
      </div>

      <section aria-labelledby="recent-orders" className="mt-14">
        <h2 id="recent-orders" className="font-serif text-2xl text-ivory">
          הזמנות אחרונות
        </h2>

        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">עדיין אין הזמנות בחשבון שלכם.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-gold/15 bg-charcoal p-5 transition-colors hover:border-gold/40"
                >
                  <div>
                    <p className="ltr-nums font-medium text-ivory" dir="ltr">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDateHe(order.placedAt)} · {order.items.length} פריטים
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="ltr-nums text-cream">{formatPrice(order.totalAgorot)}</p>
                    <p className="mt-1 text-xs text-gold">
                      {ORDER_STATUS_LABELS[order.status]}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ href, titleHe, value }: { href: string; titleHe: string; value: string }) {
  return (
    <Link
      href={href}
      className="rounded-sm border border-gold/15 bg-charcoal p-6 transition-colors hover:border-gold/40"
    >
      <p className="text-sm text-muted">{titleHe}</p>
      <p className="ltr-nums mt-2 font-serif text-2xl text-ivory">{value}</p>
    </Link>
  );
}
