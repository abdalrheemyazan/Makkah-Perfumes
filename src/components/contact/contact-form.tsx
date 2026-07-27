'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { submitContact } from '@/app/actions/contact';
import { CONTACT_INITIAL } from '@/lib/action-state';

function Field({
  name,
  labelHe,
  error,
  as = 'input',
  ...props
}: {
  name: string;
  labelHe: string;
  error?: string;
  as?: 'input' | 'textarea';
} & React.InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement>) {
  const id = useId();
  const errorId = `${id}-error`;
  const shared =
    'mt-1.5 w-full rounded-sm border border-gold/25 bg-ink px-3 py-2.5 text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none aria-[invalid=true]:border-danger';

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-cream">
        {labelHe}
      </label>
      {as === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          rows={5}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={shared}
          {...props}
        />
      ) : (
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${shared} h-11`}
          {...props}
        />
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center rounded-sm bg-gold px-7 text-sm font-medium text-ink transition-colors hover:bg-cream disabled:opacity-60"
    >
      {pending ? 'שולחים…' : 'שליחת הפנייה'}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, CONTACT_INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // On a failed submit, move focus (and scroll) to the first invalid field, or to
  // the general error banner. Focusing the DOM is a side-effect on an external
  // system — allowed in an effect — and does not call setState.
  useEffect(() => {
    if (state.status !== 'error') return;
    const form = formRef.current;
    if (!form) return;
    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form.querySelector<HTMLElement>('[data-error-summary="true"]');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus?.();
    }
  }, [state]);

  if (state.status === 'success') {
    return (
      <div
        role="status"
        className="rounded-lg border border-success/40 bg-success/10 p-6 text-sm leading-relaxed text-success"
      >
        <p className="text-base font-semibold">הפנייה נשלחה</p>
        <p className="mt-1.5">{state.messageHe}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
      {/* Honeypot — hidden from people, tempting to bots. Never fill it. */}
      <div aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="contact-company">אל תמלאו שדה זה</label>
        <input id="contact-company" type="text" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === 'error' && state.messageHe && (
        <p
          role="alert"
          tabIndex={-1}
          data-error-summary="true"
          className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          {state.messageHe}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" labelHe="שם מלא" autoComplete="name" required maxLength={60} error={state.errors.name} />
        <Field
          name="email"
          labelHe="דוא״ל"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          maxLength={254}
          error={state.errors.email}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="phone"
          labelHe="טלפון (לא חובה)"
          type="tel"
          dir="ltr"
          autoComplete="tel"
          maxLength={20}
          error={state.errors.phone}
        />
        <Field name="subject" labelHe="נושא" required maxLength={120} error={state.errors.subject} />
      </div>
      <Field name="message" labelHe="ההודעה שלכם" as="textarea" required maxLength={2000} error={state.errors.message} />

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        <p className="text-xs text-faint">הפרטים ישמשו למענה לפנייתכם בלבד.</p>
      </div>
    </form>
  );
}
