import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = { title: 'רשימת משאלות', robots: { index: false } };

const WISHLIST_CRUMB = [{ labelHe: 'בית', href: '/' }, { labelHe: 'רשימת המשאלות' }];

export default async function WishlistPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <PageIdentity titleHe="רשימת המשאלות" breadcrumb={WISHLIST_CRUMB} />
        <div className="container-editorial pt-10 pb-24">
        <div className="rounded-lg border border-gold/15 bg-charcoal p-10 text-center">
          <p className="font-serif text-xl text-ivory">נדרשת התחברות</p>
          <p className="mt-2 text-sm text-muted">
            התחברו כדי לשמור מוצרים ולצפות בהם מכל מכשיר.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/login">התחברות</ButtonLink>
            <ButtonLink href="/register" variant="secondary">
              יצירת חשבון
            </ButtonLink>
          </div>
        </div>
        </div>
      </>
    );
  }

  const items = await db.wishlistItem.findMany({
    where: { wishlist: { userId: user.id } },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: cardSelect } },
  });

  const products = items
    .map((item) => toCard(item.product))
    .filter((card): card is ProductCardData => card !== null);

  return (
    <>
      <PageIdentity
        titleHe="רשימת המשאלות"
        breadcrumb={WISHLIST_CRUMB}
        descriptionHe={`${products.length} מוצרים שמורים בחשבונכם`}
      />
      <div className="container-editorial pt-10 pb-24">
        {products.length === 0 ? (
          <div className="rounded-lg border border-gold/15 bg-charcoal p-10 text-center">
            <p className="text-xl font-semibold text-ivory">הרשימה ריקה</p>
            <p className="mt-2 text-sm text-muted">
              סמנו את סמל הלב על מוצר כדי לשמור אותו כאן.
            </p>
            <div className="mt-6">
              <ButtonLink href="/shop">למעבר לחנות</ButtonLink>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
