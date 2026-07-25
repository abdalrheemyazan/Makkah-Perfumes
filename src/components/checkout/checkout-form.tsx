'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { placeOrder } from '@/app/actions/checkout';
import { CHECKOUT_INITIAL } from '@/lib/action-state';
import { DELIVERY_METHOD_LABELS } from '@/lib/commerce/labels';
import { usePrefersReducedMotion, useA11yMotionStopped } from '@/lib/hooks';

/**
 * Every field the server can reject, in visual order, mapped from its error key
 * to the input's `name` and a Hebrew label. Drives the error summary and the
 * scroll-to-first-error behaviour.
 */
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

/**
 * Checkout form.
 *
 * Israeli address shape: street + house number are separate fields, with
 * optional entrance/floor/apartment, because that is how addresses are actually
 * written and delivered here.
 *
 * The idempotency key is generated once per mounted form. A double-click, a
 * flaky connection or a browser retry therefore resolves to the same order
 * rather than charging twice.
 */
export function CheckoutForm({
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  developmentMode,
}: {
  defaultEmail: string;
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  developmentMode: boolean;
}) {
  const [state, formAction] = useActionState(placeOrder, CHECKOUT_INITIAL);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

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
    // `center` keeps the field clear of the fixed navbar.
    el.scrollIntoView({ behavior, block: 'center' });
    el.focus({ preventScroll: true });
  };

  // After a failed submission, move the user to the problem: the first invalid
  // field (in visual order), or the general error banner if there is no field
  // to point at. Runs once per action result.
  useEffect(() => {
    if (state.status !== 'error') return;
    const first = CHECKOUT_FIELDS.find((field) => state.errors[field.key]);
    if (first) {
      focusField(first.name);
    } else if (state.messageHe) {
      const behavior: ScrollBehavior = reducedMotion || motionStopped ? 'auto' : 'smooth';
      bannerRef.current?.scrollIntoView({ behavior, block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-10">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

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

      {/* 1 — Contact */}
      <Step number={1} titleHe="פרטי התקשרות">
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

      {/* 2 — Address */}
      <Step number={2} titleHe="כתובת למשלוח">
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

      {/* 3 — Delivery */}
      <Step number={3} titleHe="אופן המשלוח">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">בחירת אופן משלוח</legend>
          {(['STANDARD_DELIVERY', 'EXPRESS_DELIVERY', 'STORE_PICKUP'] as const).map(
            (method, index) => (
              <label
                key={method}
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-gold/20 p-4 text-sm text-cream hover:border-gold/45"
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value={method}
                  defaultChecked={index === 0}
                  className="h-4 w-4 accent-[var(--color-gold)]"
                />
                <span>{DELIVERY_METHOD_LABELS[method]}</span>
              </label>
            ),
          )}
        </fieldset>
        <p className="text-xs text-faint">
          תעריפי וזמני המשלוח טרם אומתו מול המותג ומשמשים לצורכי פיתוח.
        </p>
      </Step>

      {/* 4 — Payment */}
      <Step number={4} titleHe="תשלום">
        {developmentMode ? (
          <div className="rounded-sm border border-warning/40 bg-warning/5 p-5 text-sm leading-relaxed text-warning/90">
            <p className="font-medium text-warning">תשלום במצב פיתוח</p>
            <p className="mt-1.5">
              לא חובר ספק סליקה, ולכן לא מוצג טופס כרטיס אשראי ולא נדרשים ממכם
              פרטי תשלום. ההזמנה תירשם במערכת ללא חיוב.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">טופס התשלום ייטען מספק הסליקה.</p>
        )}
      </Step>

      {/* 5 — Note + submit */}
      <Step number={5} titleHe="סיכום ואישור">
        <Field name="customerNote" labelHe="הערה להזמנה (רשות)" error={state.errors.customerNote} />
        <SubmitButton developmentMode={developmentMode} />
      </Step>
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

function SubmitButton({ developmentMode }: { developmentMode: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-13 w-full rounded-sm bg-gold px-7 text-base font-medium text-ink transition-colors hover:bg-cream disabled:opacity-60"
    >
      {pending
        ? 'מבצע הזמנה…'
        : developmentMode
          ? 'ביצוע הזמנה (מצב פיתוח)'
          : 'ביצוע הזמנה'}
    </button>
  );
}
