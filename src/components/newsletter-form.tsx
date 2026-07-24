'use client';

import { useActionState, useId } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { subscribeToNewsletter } from '@/app/actions/newsletter';
import { NEWSLETTER_INITIAL } from '@/lib/action-state';

export function NewsletterForm() {
  const [state, formAction] = useActionState(subscribeToNewsletter, NEWSLETTER_INITIAL);
  const emailId = useId();
  const consentId = useId();
  const errorId = useId();

  return (
    <form action={formAction} className="mt-4 max-w-md" noValidate>
      <label htmlFor={emailId} className="block text-sm text-cream">
        כתובת דוא״ל
      </label>

      <div className="mt-2 flex gap-2">
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          aria-describedby={state.errors.email ? errorId : undefined}
          aria-invalid={state.errors.email ? true : undefined}
          className="h-11 min-w-0 flex-1 rounded-sm border border-gold/25 bg-ink px-3 text-start text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none"
          placeholder="name@example.com"
        />
        <SubmitButton />
      </div>

      {state.errors.email && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {state.errors.email}
        </p>
      )}

      <div className="mt-3 flex items-start gap-2">
        <input
          id={consentId}
          name="consent"
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-gold)]"
          aria-describedby={state.errors.consent ? `${errorId}-consent` : undefined}
        />
        <label htmlFor={consentId} className="text-xs leading-relaxed text-muted">
          אני מאשר/ת קבלת דיוור פרסומי ומסכים/ה ל
          <Link href="/privacy" className="underline underline-offset-2 hover:text-cream">
            מדיניות הפרטיות
          </Link>
          .
        </label>
      </div>

      {state.errors.consent && (
        <p id={`${errorId}-consent`} role="alert" className="mt-2 text-sm text-danger">
          {state.errors.consent}
        </p>
      )}

      {state.status !== 'idle' && state.messageHe && (
        <p
          role="status"
          className={
            state.status === 'success' ? 'mt-3 text-sm text-success' : 'mt-3 text-sm text-danger'
          }
        >
          {state.messageHe}
        </p>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 shrink-0 rounded-sm bg-gold px-5 text-sm font-medium text-ink transition-colors hover:bg-cream disabled:opacity-50"
    >
      {pending ? 'שולח…' : 'להצטרפות'}
    </button>
  );
}
