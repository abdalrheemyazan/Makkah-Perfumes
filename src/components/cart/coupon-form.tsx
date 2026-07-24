'use client';

import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import { applyCoupon } from '@/app/actions/cart';
import { CART_ACTION_INITIAL } from '@/lib/action-state';

export function CouponForm({
  appliedCode,
  errorHe,
}: {
  appliedCode: string | null;
  errorHe: string | null;
}) {
  const [state, formAction] = useActionState(applyCoupon, CART_ACTION_INITIAL);
  const inputId = useId();

  return (
    <div className="mt-5 border-t border-gold/15 pt-5">
      <form action={formAction}>
        <label htmlFor={inputId} className="block text-sm text-cream">
          קוד קופון
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id={inputId}
            name="code"
            type="text"
            defaultValue={appliedCode ?? ''}
            dir="ltr"
            autoComplete="off"
            className="h-10 min-w-0 flex-1 rounded-sm border border-gold/25 bg-ink px-3 text-start text-sm text-ivory uppercase placeholder:text-faint focus:border-gold focus:outline-none"
            placeholder="WELCOME10"
          />
          <ApplyButton />
        </div>
      </form>

      {appliedCode && state.status !== 'error' && (
        <p className="mt-2 text-xs text-success">
          הקופון <span dir="ltr">{appliedCode}</span> הוחל
        </p>
      )}

      {(state.status === 'error' || errorHe) && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {state.status === 'error' ? state.messageHe : errorHe}
        </p>
      )}
    </div>
  );
}

function ApplyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 shrink-0 rounded-sm border border-gold/40 px-4 text-sm text-cream transition-colors hover:border-gold hover:text-ivory disabled:opacity-50"
    >
      {pending ? 'בודק…' : 'החלה'}
    </button>
  );
}
