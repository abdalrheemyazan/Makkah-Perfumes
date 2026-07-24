import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { readCart } from '@/lib/commerce/cart';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [cart, user] = await Promise.all([readCart(), getCurrentUser()]);

  const wishlistCount = user
    ? await db.wishlistItem.count({ where: { wishlist: { userId: user.id } } })
    : 0;

  return (
    <>
      <SiteHeader cartCount={cart.itemCount} wishlistCount={wishlistCount} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
