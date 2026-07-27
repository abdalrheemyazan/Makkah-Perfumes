'use client';

import { useActionState } from 'react';
import { unsubscribeRestock } from '@/app/actions/restock';
import { RESTOCK_INITIAL } from '@/lib/action-state';

/**
 * Confirm-then-unsubscribe. The link in the email lands here; the actual
 * unsubscribe only runs when the customer presses the button, so an email
 * client that prefetches the link cannot cancel the subscription by accident.
 */
export function RestockUnsubscribeForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(unsubscribeRestock, RESTOCK_INITIAL);

  if (state.status === 'success') {
    return (
      <p className="mt-6 text-sm text-success" role="status">
        העדכון בוטל. לא תקבלו עוד התראות על מוצר זה.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col items-start gap-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-sm bg-gold px-6 text-sm font-medium text-ink hover:bg-cream disabled:opacity-60"
      >
        {pending ? 'מבטל…' : 'אישור ביטול העדכון'}
      </button>
      {state.status === 'error' && (
        <p className="text-sm text-danger" role="alert">
          {state.messageHe}
        </p>
      )}
    </form>
  );
}
