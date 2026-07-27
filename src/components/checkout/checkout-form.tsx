'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { placeOrder } from '@/app/actions/checkout';
import { CHECKOUT_INITIAL } from '@/lib/action-state';
import { formatPrice } from '@/lib/commerce/money';
import { SHIPPING_PRICES } from '@/lib/commerce/pricing';
import type { CartView } from '@/lib/commerce/cart';
import { usePrefersReducedMotion, useA11yMotionStopped } from '@/lib/hooks';

/**
 * Fields the server can reject, mapped from error key → input name → Hebrew label.
 * Address fields only appear (and are only validated) for delivery methods.
 */
const CHECKOUT_FIELDS: { key: string; name: string; labelHe: string }[] = [
  { key: 'email', name: 'email', labelHe: 'דוא״ל' },
  { key: 'address.firstName', name: 'firstName', labelHe: 'שם פרטי' },
  { key: 'address.lastName', name: 'lastName', labelHe: 'שם משפחה' },
  { key: 'address.phone', name: 'phone', labelHe: 'טלפון' },
  { key: 'address.street', name: 'street', labelHe: 'רחוב' },
  { key: 'address.houseNumber', name: 'houseNumber', labelHe: 'מספר בית' },
  { key: 'address.city', name: 'city', labelHe: 'עיר' },
  { key: 'address.postalCode', name: 'postalCode', labelHe: 'מיקוד' },
  { key: 'customerNote', name: 'customerNote', labelHe: 'הערה להזמנה' },
];

type ShippingMethod = 'SELF_PICKUP' | 'REGULAR' | 'EXPRESS';

const SHIPPING_OPTIONS: { value: ShippingMethod; labelHe: string; priceHe: string }[] = [
  { value: 'SELF_PICKUP', labelHe: 'איסוף עצמי', priceHe: 'חינם' },
  { value: 'REGULAR', labelHe: 'משלוח רגיל', priceHe: formatPrice(SHIPPING_PRICES.REGULAR) },
  { value: 'EXPRESS', labelHe: 'משלוח מהיר', priceHe: formatPrice(SHIPPING_PRICES.EXPRESS) },
];

/**
 * Checkout form.
 *
 * `shippingMethod` is the single source of truth (default SELF_PICKUP). Address
 * fields are only rendered — and therefore only submitted and only validated —
 * for REGULAR/EXPRESS. Self-pickup needs only email + name + phone. The global
 * error only appears after a real submit. The idempotency key is generated once
 * per mounted form, so a double-click resolves to the same order.
 */
export function CheckoutForm({
  cart,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  defaultPhone,
}: {
  cart: CartView;
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
  const [method, setMethod] = useState<ShippingMethod>('SELF_PICKUP');
  const needsAddress = method !== 'SELF_PICKUP';

  // Optimistic display totals (the server recomputes authoritatively on submit).
  const shippingAgorot =
    method === 'SELF_PICKUP' ? 0 : method === 'EXPRESS' ? SHIPPING_PRICES.EXPRESS : SHIPPING_PRICES.REGULAR;
  const subtotalAgorot = cart.totals.subtotalAgorot;
  const discountAgorot = cart.totals.discountAgorot;
  const totalAgorot = Math.max(0, subtotalAgorot - discountAgorot) + shippingAgorot;

  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const motionStopped = useA11yMotionStopped();

  const invalidFields = CHECKOUT_FIELDS.filter((field) => state.errors[field.key]);

  const focusField = (name: string) => {
    const form = formRef.current;
    if (!form) return;
    const el = form.querySelector<HTMLElement>(`[name="${name}"]`);
    if (!el) return;
    const behavior: ScrollBehavior = reducedMotion || motionStopped ? 'auto' : 'smooth';
    el.scrollIntoView({ behavior, block: 'center' });
    el.focus({ preventScroll: true });
  };

  // After a failed submit, move to the first invalid field, or the error banner.
  useEffect(() => {
    if (state.status !== 'error') return;
    const first = CHECKOUT_FIELDS.find((field) => state.errors[field.key]);
    if (first) focusField(first.name);
    else if (state.messageHe) {
      const behavior: ScrollBehavior = reducedMotion || motionStopped ? 'auto' : 'smooth';
      bannerRef.current?.scrollIntoView({ behavior, block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-10">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="shippingMethod" value={method} />

      {state.status === 'error' && (state.messageHe || invalidFields.length > 0) && (
        <div
          ref={bannerRef}
          role="alert"
          className="rounded-sm border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
        >
          {state.messageHe && <p className="font-medium">{state.messageHe}</p>}
          {invalidFields.length > 0 && (
            <>
              <p className={state.messageHe ? 'mt-2 font-medium' : 'font-medium'}>יש לתקן את הפרטים הבאים:</p>
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

      {/* 1 — Contact (always required) */}
      <Step number={1} titleHe="פרטי התקשרות">
        <Field name="email" labelHe="דוא״ל" type="email" autoComplete="email" dir="ltr" defaultValue={defaultEmail} error={state.errors.email} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="firstName" labelHe="שם פרטי" autoComplete="given-name" defaultValue={defaultFirstName} error={state.errors['address.firstName']} required />
          <Field name="lastName" labelHe="שם משפחה" autoComplete="family-name" defaultValue={defaultLastName} error={state.errors['address.lastName']} required />
        </div>
        <Field name="phone" labelHe="טלפון" type="tel" autoComplete="tel" dir="ltr" placeholder="050-123-4567" defaultValue={defaultPhone} error={state.errors['address.phone']} required />
      </Step>

      {/* 2 — Shipping method (single source of truth) */}
      <Step number={2} titleHe="אופן קבלת ההזמנה">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">בחירת אופן קבלת ההזמנה</legend>
          {SHIPPING_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-gold/20 p-4 text-sm text-cream hover:border-gold/45"
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shippingMethodChoice"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                  className="h-4 w-4 accent-[var(--color-gold)]"
                />
                <span>{option.labelHe}</span>
              </span>
              <span className="ltr-nums text-gold">{option.priceHe}</span>
            </label>
          ))}
        </fieldset>
        {!needsAddress && (
          <p className="text-xs text-faint">באיסוף עצמי אין צורך בכתובת. פרטי האיסוף יתואמו לאחר אישור ההזמנה.</p>
        )}
      </Step>

      {/* 3 — Address (only for delivery; not rendered → not submitted → not validated) */}
      {needsAddress && (
        <Step number={3} titleHe="כתובת למשלוח">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field name="street" labelHe="רחוב" autoComplete="address-line1" error={state.errors['address.street']} required />
            <Field name="houseNumber" labelHe="מספר בית" error={state.errors['address.houseNumber']} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="entrance" labelHe="כניסה" error={state.errors['address.entrance']} />
            <Field name="floor" labelHe="קומה" error={state.errors['address.floor']} />
            <Field name="apartment" labelHe="דירה" error={state.errors['address.apartment']} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="city" labelHe="עיר" autoComplete="address-level2" error={state.errors['address.city']} required />
            <Field name="postalCode" labelHe="מיקוד (רשות)" autoComplete="postal-code" dir="ltr" error={state.errors['address.postalCode']} />
          </div>
          <Field name="notes" labelHe="הערות לשליח (רשות)" error={state.errors['address.notes']} />
        </Step>
      )}

      {/* 4 — Payment */}
      <Step number={needsAddress ? 4 : 3} titleHe="תשלום">
        <p className="text-sm leading-relaxed text-cream/80">פרטי התשלום והמשלוח יתואמו לאחר אישור ההזמנה.</p>
      </Step>

      {/* 5 — Summary + submit */}
      <Step number={needsAddress ? 5 : 4} titleHe="סיכום ואישור">
        <Field name="customerNote" labelHe="הערה להזמנה (רשות)" error={state.errors.customerNote} />

        <dl className="flex flex-col gap-2 rounded-sm border border-gold/15 bg-charcoal p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">סכום ביניים</dt>
            <dd className="ltr-nums text-cream">{formatPrice(subtotalAgorot)}</dd>
          </div>
          {discountAgorot > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">הנחת קופון</dt>
              <dd className="ltr-nums text-success">−{formatPrice(discountAgorot)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">משלוח</dt>
            <dd className="ltr-nums text-cream">{shippingAgorot === 0 ? 'חינם' : formatPrice(shippingAgorot)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t border-gold/15 pt-2">
            <dt className="font-serif text-base text-ivory">סה״כ</dt>
            <dd className="ltr-nums font-serif text-lg text-gold">{formatPrice(totalAgorot)}</dd>
          </div>
        </dl>

        <SubmitButton />
      </Step>
    </form>
  );
}

function Step({ number, titleHe, children }: { number: number; titleHe: string; children: React.ReactNode }) {
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
      {pending ? 'שולח…' : 'אישור הזמנה'}
    </button>
  );
}
