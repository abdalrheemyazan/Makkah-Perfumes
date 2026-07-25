import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { AccessibilitySettings } from '@/components/a11y/accessibility-settings';
import { PageTransition } from '@/components/layout/page-transition';
import { readCartSummary } from '@/lib/commerce/cart';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Only the cheap item-count aggregate here — never the full cart with all its
  // product/variant/image/coupon relations. The full cart is loaded on /cart and
  // checkout, where it is actually rendered.
  const [cart, user] = await Promise.all([readCartSummary(), getCurrentUser()]);

  const wishlistCount = user
    ? await db.wishlistItem.count({ where: { wishlist: { userId: user.id } } })
    : 0;

  const account = {
    isLoggedIn: Boolean(user),
    displayName: user?.firstName?.trim() || null,
    isAdmin: user ? isAdmin(user) : false,
  };

  return (
    <>
      <SiteHeader cartCount={cart.itemCount} wishlistCount={wishlistCount} account={account} />
      <main id="main" className="flex flex-1 flex-col">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      <AccessibilitySettings />
    </>
  );
}
