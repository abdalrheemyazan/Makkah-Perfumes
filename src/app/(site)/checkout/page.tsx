import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readCart } from '@/lib/commerce/cart';
import { getCurrentUser } from '@/lib/auth';
import { isDevelopmentPaymentMode } from '@/lib/commerce/payment';
import { formatPrice } from '@/lib/commerce/money';
import { CheckoutForm } from '@/components/checkout/checkout-form';

export const metadata: Metadata = { title: 'תשלום', robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([readCart(), getCurrentUser()]);

  if (cart.lines.length === 0) redirect('/cart');

  const developmentMode = isDevelopmentPaymentMode();

  return (
    <div className="container-editorial pt-32 pb-24">
      <h1 className="font-serif text-4xl text-ivory">תשלום</h1>

      {developmentMode && (
        <div
          role="note"
          className="mt-6 rounded-sm border border-warning/50 bg-warning/10 p-5 text-sm leading-relaxed text-warning"
        >
          <p className="font-medium">מצב פיתוח — לא מתבצע חיוב אמיתי</p>
          <p className="mt-1.5 text-warning/90">
            טרם חובר ספק סליקה. ההזמנה תיווצר במערכת לצורכי בדיקה בלבד, לא יתבצע
            חיוב ולא יישלח משלוח. אין להזין פרטי כרטיס אשראי — אנחנו לא מבקשים
            אותם ולא שומרים אותם.
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <CheckoutForm
          defaultEmail={user?.email ?? ''}
          defaultFirstName={user?.firstName ?? ''}
          defaultLastName={user?.lastName ?? ''}
          defaultPhone={user?.phone ?? ''}
          developmentMode={developmentMode}
        />

        <aside aria-labelledby="checkout-summary" className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-sm border border-gold/15 bg-charcoal p-6">
            <h2 id="checkout-summary" className="font-serif text-xl text-ivory">
              ההזמנה שלכם
            </h2>

            <ul className="mt-5 flex flex-col gap-4">
              {cart.lines.map((line) => (
                <li key={line.itemId} className="flex justify-between gap-4 text-sm">
                  <div>
                    <p className="text-cream">{line.productNameHe}</p>
                    <p className="text-xs text-faint">
                      {line.variantLabel} · כמות <span className="ltr-nums">{line.quantity}</span>
                    </p>
                  </div>
                  <p className="ltr-nums shrink-0 text-cream">
                    {formatPrice(line.lineTotalAgorot)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 flex flex-col gap-2.5 border-t border-gold/15 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">סכום ביניים</dt>
                <dd className="ltr-nums text-cream">{formatPrice(cart.totals.subtotalAgorot)}</dd>
              </div>
              {cart.totals.discountAgorot > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">הנחה</dt>
                  <dd className="ltr-nums text-success">
                    −{formatPrice(cart.totals.discountAgorot)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">משלוח</dt>
                <dd className="ltr-nums text-cream">
                  {cart.totals.shippingAgorot === 0
                    ? 'חינם'
                    : formatPrice(cart.totals.shippingAgorot)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-gold/15 pt-5">
              <span className="font-serif text-lg text-ivory">סה״כ</span>
              <span className="ltr-nums font-serif text-2xl text-gold">
                {formatPrice(cart.totals.totalAgorot)}
              </span>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-faint">
              הסכום מחושב מחדש בשרת בעת ביצוע ההזמנה.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
