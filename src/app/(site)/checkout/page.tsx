import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readCart } from '@/lib/commerce/cart';
import { getCurrentUser } from '@/lib/auth';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'השלמת הזמנה', robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([readCart(), getCurrentUser()]);

  if (!user) {
    redirect('/login?redirectTo=/checkout');
  }

  if (cart.id) {
    const cartRow = await db.cart.findUnique({
      where: { id: cart.id },
      select: { convertedToOrderId: true },
    });
    if (cartRow?.convertedToOrderId) {
      const existingOrder = await db.order.findUnique({
        where: { id: cartRow.convertedToOrderId },
        select: { orderNumber: true },
      });
      if (existingOrder) {
        redirect(`/checkout/success?order=${encodeURIComponent(existingOrder.orderNumber)}`);
      }
    }
  }

  if (cart.lines.length === 0) redirect('/cart');

  return (
    <div className="container-editorial pt-32 pb-24">
      <p className="text-xs font-medium tracking-[0.16em] text-gold">שלב אחרון</p>
      <h1 className="mt-3 font-serif text-4xl text-ivory">השלמת הזמנה</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/70">
        בחרו אופן קבלה, בדקו את הסיכום ושלחו את בקשת ההזמנה לאישור החנות.
      </p>

      <CheckoutForm
        cart={cart}
        defaultEmail={user.email}
        defaultFirstName={user.firstName ?? ''}
        defaultLastName={user.lastName ?? ''}
        defaultPhone={user.phone ?? ''}
      />
    </div>
  );
}
