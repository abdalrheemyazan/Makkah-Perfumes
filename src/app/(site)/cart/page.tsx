import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { readCart } from '@/lib/commerce/cart';
import { formatPrice } from '@/lib/commerce/money';
import { ButtonLink } from '@/components/ui/button';
import { CartQuantityControl, RemoveCartItem } from '@/components/cart/cart-controls';
import { CouponForm } from '@/components/cart/coupon-form';
import { PageIdentity } from '@/components/layout/page-identity';

export const metadata: Metadata = { title: 'עגלת הקניות', robots: { index: false } };

const CART_CRUMB = [{ labelHe: 'בית', href: '/' }, { labelHe: 'עגלת הקניות' }];

export default async function CartPage() {
  const cart = await readCart();

  if (cart.lines.length === 0) {
    return (
      <>
        <PageIdentity titleHe="עגלת הקניות" breadcrumb={CART_CRUMB} />
        <div className="container-editorial pt-10 pb-24">
          <div className="rounded-sm border border-gold/15 bg-charcoal p-12 text-center">
            <p className="text-2xl font-semibold text-ivory">העגלה ריקה</p>
            <p className="mt-3 text-sm text-muted">עדיין לא הוספתם מוצרים לעגלה.</p>
            <div className="mt-8">
              <ButtonLink href="/shop" size="lg">
                למעבר לחנות
              </ButtonLink>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageIdentity
        titleHe="עגלת הקניות"
        breadcrumb={CART_CRUMB}
        descriptionHe={`${cart.itemCount} פריטים בעגלה`}
      />
      <div className="container-editorial pt-10 pb-24">

      {cart.hasStockProblem && (
        <p role="alert" className="mt-6 rounded-sm border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          חלק מהפריטים חורגים מהמלאי הזמין. עדכנו את הכמויות כדי להמשיך.
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
        {/* Lines */}
        <ul className="flex flex-col divide-y divide-gold/10 border-y border-gold/10">
          {cart.lines.map((line) => (
            <li key={line.itemId} className="flex gap-5 py-6">
              <Link
                href={`/shop/${line.productSlug}`}
                className="relative h-28 w-24 shrink-0 overflow-hidden rounded-sm border border-gold/15 bg-charcoal"
              >
                {line.imageUrl && (
                  <Image
                    src={line.imageUrl}
                    alt={line.imageAltHe}
                    fill
                    sizes="96px"
                    className="object-contain p-2"
                  />
                )}
              </Link>

              <div className="flex flex-1 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg text-ivory">
                      <Link href={`/shop/${line.productSlug}`} className="hover:text-gold">
                        {line.productNameHe}
                      </Link>
                    </h2>
                    <p className="text-xs text-muted" dir="ltr" lang="en">
                      {line.productNameEn}
                    </p>
                    <p className="mt-1 text-xs text-faint">{line.variantLabel}</p>
                  </div>

                  <p className="ltr-nums text-base text-ivory">
                    {formatPrice(line.lineTotalAgorot)}
                  </p>
                </div>

                {line.exceedsStock && (
                  <p role="alert" className="mt-2 text-xs text-danger">
                    נותרו <span className="ltr-nums">{line.availableQuantity}</span> יחידות בלבד
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-4 pt-4">
                  <CartQuantityControl
                    itemId={line.itemId}
                    quantity={line.quantity}
                    max={Math.max(1, line.availableQuantity)}
                    productNameHe={line.productNameHe}
                  />
                  <RemoveCartItem itemId={line.itemId} productNameHe={line.productNameHe} />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-sm border border-gold/15 bg-charcoal p-6">
            <h2 id="summary-heading" className="font-serif text-xl text-ivory">
              סיכום הזמנה
            </h2>

            <CouponForm appliedCode={cart.couponCode} errorHe={cart.couponErrorHe} />

            <dl className="mt-6 flex flex-col gap-3 text-sm">
              <Row label="סכום ביניים" value={formatPrice(cart.totals.subtotalAgorot)} />
              {cart.totals.discountAgorot > 0 && (
                <Row
                  label="הנחה"
                  value={`−${formatPrice(cart.totals.discountAgorot)}`}
                  accent="success"
                />
              )}
              <Row
                label="משלוח"
                value={
                  cart.totals.shippingAgorot === 0
                    ? 'חינם'
                    : formatPrice(cart.totals.shippingAgorot)
                }
              />
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-gold/15 pt-5">
              <span className="font-serif text-lg text-ivory">סה״כ לתשלום</span>
              <span className="ltr-nums font-serif text-2xl text-gold">
                {formatPrice(cart.totals.totalAgorot)}
              </span>
            </div>

            <p className="mt-3 text-xs text-faint">
              אופן וזמני המשלוח הסופיים יתואמו עם אישור ההזמנה.
            </p>

            <div className="mt-6">
              <ButtonLink
                href="/checkout"
                size="lg"
                className="w-full"
                aria-disabled={cart.hasStockProblem}
              >
                למעבר לתשלום
              </ButtonLink>
            </div>

            <Link
              href="/shop"
              className="mt-4 block text-center text-sm text-muted hover:text-ivory"
            >
              המשך קנייה
            </Link>
          </div>
        </aside>
      </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'success';
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={`ltr-nums ${accent === 'success' ? 'text-success' : 'text-cream'}`}>
        {value}
      </dd>
    </div>
  );
}
