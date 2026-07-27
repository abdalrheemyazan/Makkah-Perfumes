'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { placeOrder } from '@/app/actions/checkout';
import { CHECKOUT_INITIAL } from '@/lib/action-state';
import { usePrefersReducedMotion, useA11yMotionStopped } from '@/lib/hooks';

/**
 * Every field the server can reject, in visual order, mapped from its error key
 * to the input's `name` and a Hebrew label. Drives the error summary and the
 * scroll-to-first-error behaviour.
 */
import { SHIPPING_METHODS, type ShippingMethod } from '@/lib/commerce/pricing';
import { formatPrice } from '@/lib/commerce/money';

const CHECKOUT_FIELDS: { key: string; name: string; labelHe: string }[] = [
  { key: 'email', name: 'email', labelHe: 'דוא״ל' },
  { key: 'address.firstName', name: 'firstName', labelHe: 'שם פרטי' },
  { key: 'address.lastName', name: 'lastName', labelHe: 'שם משפחה' },
  { key: 'address.phone', name: 'phone', labelHe: 'טלפון' },
  { key: 'address.street', name: 'street', labelHe: 'רחוב' },
  { key: 'address.houseNumber', name: 'houseNumber', labelHe: 'מספר בית' },
  { key: 'address.entrance', name: 'entrance', labelHe: 'כניסה' },
  { key: 'address.floor', name: 'floor', labelHe: 'קומה' },
  { key: 'address.apartment', name: 'apartment', labelHe: 'דירה' },
  { key: 'address.city', name: 'city', labelHe: 'עיר' },
  { key: 'address.postalCode', name: 'postalCode', labelHe: 'מיקוד' },
  { key: 'address.notes', name: 'notes', labelHe: 'הערות לשליח' },
  { key: 'customerNote', name: 'customerNote', labelHe: 'הערה להזמנה' },
];

export type CheckoutCartData = {
  lines: {
    itemId: string;
    productNameHe: string;
    variantLabel: string;
    quantity: number;
    lineTotalAgorot: number;
  }[];
  totals: {
    subtotalAgorot: number;
    discountAgorot: number;
  };
};

export function CheckoutForm({
  cart,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  defaultPhone,
}: {
  cart: CheckoutCartData;
  defaultEmail: string;
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
}) {
  const [state, formAction] = useActionState(placeOrder, CHECKOUT_INITIAL);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('SELF_PICKUP');

  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const motionStopped = useA11yMotionStopped();

  const productsSubtotal = cart.totals.subtotalAgorot;
  const discountAmount = cart.totals.discountAgorot;
  const productsAfterDiscount = Math.max(0, productsSubtotal - discountAmount);
  const shippingAmount = SHIPPING_METHODS[shippingMethod].amount;
  const grandTotal = productsAfterDiscount + shippingAmount;

  const isDeliveryRequired = shippingMethod !== 'SELF_PICKUP';

  const invalidFields = CHECKOUT_FIELDS.filter((field) => {
    if (!isDeliveryRequired && field.key.startsWith('address.')) {
      return false;
    }
    return Boolean(state.errors[field.key]);
  });

  const focusField = (name: string) => {
    const form = formRef.current;
    if (!form) return;
    const el = form.querySelector<HTMLElement>(`[name="${name}"]`);
    if (!el) return;
    const behavior: ScrollBehavior = reducedMotion || motionStopped ? 'auto' : 'smooth';
    el.scrollIntoView({ behavior, block: 'center' });
    el.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (state.status !== 'error') return;
    const first = invalidFields.find((field) => state.errors[field.key]);
    if (first) {
      focusField(first.name);
    } else if (state.messageHe) {
      const behavior: ScrollBehavior = reducedMotion || motionStopped ? 'auto' : 'smooth';
      bannerRef.current?.scrollIntoView({ behavior, block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="flex flex-col gap-10">
        {state.status === 'error' && (state.messageHe || invalidFields.length > 0) && (
          <div
            ref={bannerRef}
            role="alert"
            className="rounded-sm border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
          >
            {state.messageHe && <p className="font-medium">{state.messageHe}</p>}
            {invalidFields.length > 0 && (
              <>
                <p className={state.messageHe ? 'mt-2 font-medium' : 'font-medium'}>
                  יש לתקן את הפרטים הבאים:
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {invalidFields.map((field) => (
                    <li key={field.key}>
                      <button
                        type="button"
                        onClick={() => focusField(field.name)}
                        className="text-start underline underline-offset-2 hover:text-ivory"
                      >
                        {field.labelHe} — {state.errors[field.key]}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* 1 — Delivery Option */}
        <Step number={1} titleHe="אופן המשלוח">
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">בחירת אופן משלוח</legend>
            {(['SELF_PICKUP', 'REGULAR', 'EXPRESS'] as const).map((method) => {
              const option = SHIPPING_METHODS[method];
              const isChecked = shippingMethod === method;
              return (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center justify-between rounded-sm border p-4 text-sm transition-colors ${
                    isChecked
                      ? 'border-gold bg-gold/10 text-ivory'
                      : 'border-gold/20 text-cream hover:border-gold/45'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method}
                      checked={isChecked}
                      onChange={() => setShippingMethod(method)}
                      className="h-4 w-4 accent-[var(--color-gold)]"
                    />
                    <span>{option.label}</span>
                  </div>
                  <span className="ltr-nums font-medium text-gold">
                    {option.amount === 0 ? 'חינם' : formatPrice(option.amount)}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {shippingMethod === 'SELF_PICKUP' && (
            <p className="mt-2 text-xs leading-relaxed text-gold">
              לאחר אישור ההזמנה ניצור איתכם קשר לתיאום האיסוף.
            </p>
          )}
        </Step>

        {/* 2 — Contact */}
        <Step number={2} titleHe="פרטי התקשרות">
          <Field
            name="email"
            labelHe="דוא״ל"
            type="email"
            autoComplete="email"
            dir="ltr"
            defaultValue={defaultEmail}
            error={state.errors.email}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="firstName"
              labelHe="שם פרטי"
              autoComplete="given-name"
              defaultValue={defaultFirstName}
              error={state.errors['address.firstName']}
              required
            />
            <Field
              name="lastName"
              labelHe="שם משפחה"
              autoComplete="family-name"
              defaultValue={defaultLastName}
              error={state.errors['address.lastName']}
              required
            />
          </div>
          <Field
            name="phone"
            labelHe="טלפון"
            type="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="050-123-4567"
            defaultValue={defaultPhone}
            error={state.errors['address.phone']}
            required
          />
        </Step>

        {/* 3 — Address / Pickup details */}
        {isDeliveryRequired ? (
          <Step number={3} titleHe="כתובת למשלוח">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field
                name="street"
                labelHe="רחוב"
                autoComplete="address-line1"
                error={state.errors['address.street']}
                required
              />
              <Field
                name="houseNumber"
                labelHe="מספר בית"
                error={state.errors['address.houseNumber']}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="entrance" labelHe="כניסה" error={state.errors['address.entrance']} />
              <Field name="floor" labelHe="קומה" error={state.errors['address.floor']} />
              <Field name="apartment" labelHe="דירה" error={state.errors['address.apartment']} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="city"
                labelHe="עיר"
                autoComplete="address-level2"
                error={state.errors['address.city']}
                required
              />
              <Field
                name="postalCode"
                labelHe="מיקוד (רשות)"
                autoComplete="postal-code"
                dir="ltr"
                error={state.errors['address.postalCode']}
              />
            </div>
            <Field name="notes" labelHe="הערות לשליח (רשות)" error={state.errors['address.notes']} />
          </Step>
        ) : (
          <Step number={3} titleHe="פרטי איסוף">
            <p className="text-sm leading-relaxed text-gold">
              לאחר אישור ההזמנה ניצור איתכם קשר לתיאום האיסוף.
            </p>
          </Step>
        )}

        {/* 4 — Payment */}
        <Step number={4} titleHe="תשלום">
          <p className="text-sm leading-relaxed text-cream/80">
            פרטי התשלום והמשלוח יתואמו לאחר אישור ההזמנה.
          </p>
        </Step>

        {/* 5 — Note + submit */}
        <Step number={5} titleHe="סיכום ואישור">
          <Field name="customerNote" labelHe="הערה להזמנה (רשות)" error={state.errors.customerNote} />
          <SubmitButton />
        </Step>
      </div>

      {/* Summary Aside */}
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
              <dd className="ltr-nums text-cream">{formatPrice(productsSubtotal)}</dd>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">הנחת קופון</dt>
                <dd className="ltr-nums text-success">−{formatPrice(discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">משלוח ({SHIPPING_METHODS[shippingMethod].label})</dt>
              <dd className="ltr-nums text-cream">
                {shippingAmount === 0 ? 'חינם' : formatPrice(shippingAmount)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-gold/15 pt-5">
            <span className="font-serif text-lg text-ivory">סה״כ לתשלום</span>
            <span className="ltr-nums font-serif text-2xl text-gold">
              {formatPrice(grandTotal)}
            </span>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-faint">
            הסכום מחושב מחדש בשרת בעת ביצוע ההזמנה.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Step({
  number,
  titleHe,
  children,
}: {
  number: number;
  titleHe: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gold/15 pt-8 first:border-0 first:pt-0">
      <h2 className="flex items-center gap-3 font-serif text-xl text-ivory">
        <span className="ltr-nums grid h-7 w-7 place-items-center rounded-full border border-gold/45 text-xs text-gold">
          {number}
        </span>
        {titleHe}
      </h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  name,
  labelHe,
  error,
  ...props
}: {
  name: string;
  labelHe: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-cream">
        {labelHe}
        {props.required && (
          <span className="ms-1 text-gold" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-1.5 h-11 w-full rounded-sm border border-gold/25 bg-ink px-3 text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none aria-[invalid=true]:border-danger"
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-13 w-full rounded-sm bg-gold px-7 text-base font-medium text-ink transition-colors hover:bg-cream disabled:opacity-60"
    >
      {pending ? 'ההזמנה נשלחת...' : 'אישור הזמנה'}
    </button>
  );
}
