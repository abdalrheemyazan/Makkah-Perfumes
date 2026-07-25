'use client';

import { useActionState, useId } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { login, register, requestPasswordReset } from '@/app/actions/auth';
import { AUTH_INITIAL } from '@/lib/action-state';

function Field({
  name,
  labelHe,
  error,
  ...props
}: { name: string; labelHe: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-cream">
        {labelHe}
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

function Submit({ labelHe, pendingLabelHe }: { labelHe: string; pendingLabelHe: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-sm bg-gold text-sm font-medium text-ink transition-colors hover:bg-cream disabled:opacity-60"
    >
      {pending ? pendingLabelHe : labelHe}
    </button>
  );
}

function Alert({ status, messageHe }: { status: string; messageHe: string }) {
  if (status === 'idle' || !messageHe) return null;
  return (
    <p
      role="alert"
      className={
        status === 'success'
          ? 'rounded-sm border border-success/40 bg-success/10 p-3 text-sm text-success'
          : 'rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-danger'
      }
    >
      {messageHe}
    </p>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, AUTH_INITIAL);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Alert status={state.status} messageHe={state.messageHe} />
      <Field
        name="email"
        labelHe="דוא״ל"
        type="email"
        autoComplete="email"
        dir="ltr"
        required
        error={state.errors.email}
      />
      <Field
        name="password"
        labelHe="סיסמה"
        type="password"
        autoComplete="current-password"
        dir="ltr"
        required
        error={state.errors.password}
      />
      <Submit labelHe="התחברות" pendingLabelHe="מתחבר…" />
      <div className="flex justify-between text-xs">
        <Link href="/forgot-password" className="text-muted hover:text-ivory">
          שכחתי סיסמה
        </Link>
        <Link href="/register" className="text-gold hover:text-cream">
          יצירת חשבון חדש
        </Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(register, AUTH_INITIAL);
  const consentId = useId();

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Alert status={state.status} messageHe={state.messageHe} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="firstName"
          labelHe="שם פרטי"
          autoComplete="given-name"
          required
          error={state.errors.firstName}
        />
        <Field
          name="lastName"
          labelHe="שם משפחה"
          autoComplete="family-name"
          required
          error={state.errors.lastName}
        />
      </div>
      <Field
        name="email"
        labelHe="דוא״ל"
        type="email"
        autoComplete="email"
        dir="ltr"
        required
        error={state.errors.email}
      />
      <Field
        name="password"
        labelHe="סיסמה (לפחות 8 תווים, אות וספרה)"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        required
        error={state.errors.password}
      />

      <div className="flex items-start gap-2">
        <input
          id={consentId}
          name="acceptsMarketing"
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-gold)]"
        />
        <label htmlFor={consentId} className="text-xs leading-relaxed text-muted">
          אשמח לקבל עדכונים על השקות ומבצעים.
        </label>
      </div>

      <Submit labelHe="יצירת חשבון" pendingLabelHe="יוצר חשבון…" />
      <p className="text-xs text-muted">
        כבר יש לכם חשבון?{' '}
        <Link href="/login" className="text-gold hover:text-cream">
          להתחברות
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, AUTH_INITIAL);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Alert status={state.status} messageHe={state.messageHe} />
      <Field name="email" labelHe="דוא״ל" type="email" autoComplete="email" dir="ltr" required />
      <Submit labelHe="שליחת קישור לאיפוס" pendingLabelHe="שולח…" />
      <Link href="/login" className="text-xs text-muted hover:text-ivory">
        חזרה להתחברות
      </Link>
    </form>
  );
}

export function LogoutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex h-11 items-center gap-2 rounded-sm border border-gold/35 px-5 text-sm font-medium text-cream transition-colors hover:border-gold hover:text-ivory focus-visible:border-gold"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        התנתקות
      </button>
    </form>
  );
}
