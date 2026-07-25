import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { AccessibilitySettings } from '@/components/a11y/accessibility-settings';
import { PageTransition } from '@/components/layout/page-transition';
import { readCart } from '@/lib/commerce/cart';
import { getCurrentUser, isAdmin, hasRole } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [cart, user] = await Promise.all([readCart(), getCurrentUser()]);

  const wishlistCount = user
    ? await db.wishlistItem.count({ where: { wishlist: { userId: user.id } } })
    : 0;

  const adminInfo = user
    ? { isAdmin: isAdmin(user), isSuperAdmin: hasRole(user, 'SUPER_ADMIN') }
    : null;

  return (
    <>
      <SiteHeader cartCount={cart.itemCount} wishlistCount={wishlistCount} adminInfo={adminInfo} />
      <main id="main" className="flex flex-1 flex-col">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      <AccessibilitySettings />
    </>
  );
}
