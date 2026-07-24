'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { addToCart } from '@/app/actions/cart';
import { CART_ACTION_INITIAL } from '@/lib/action-state';
import { cn } from '@/lib/utils';

/**
 * Add-to-cart control.
 *
 * The pending state is a label swap only — no size or position change — so the
 * button never moves out from under the pointer mid-click.
 */
export function AddToCartButton({
  variantId,
  quantity = 1,
  disabled,
  disabledLabelHe = 'אזל מהמלאי',
  labelHe = 'הוספה לעגלה',
  size = 'md',
  className,
}: {
  variantId: string;
  quantity?: number;
  disabled?: boolean;
  disabledLabelHe?: string;
  labelHe?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [state, formAction] = useActionState(addToCart, CART_ACTION_INITIAL);

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          'inline-flex h-11 w-full items-center justify-center rounded-sm border border-faint/40 text-sm text-faint',
          size === 'sm' && 'h-9 text-xs',
          className,
        )}
      >
        {disabledLabelHe}
      </button>
    );
  }

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={quantity} />
      <SubmitButton labelHe={labelHe} size={size} />
      <StatusMessage status={state.status} messageHe={state.messageHe} />
    </form>
  );
}

function SubmitButton({ labelHe, size }: { labelHe: string; size: 'sm' | 'md' | 'lg' }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex w-full items-center justify-center rounded-sm bg-gold font-medium text-ink transition-colors duration-200 hover:bg-cream disabled:opacity-60',
        size === 'sm' && 'h-9 px-3 text-xs',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-13 px-7 text-base',
      )}
    >
      {pending ? 'מוסיף…' : labelHe}
    </button>
  );
}

/**
 * Announces the result to screen readers, then clears itself so a stale
 * "added" message does not linger next to the button.
 *
 * Visibility is derived rather than mirrored: the effect only records *which*
 * message has been dismissed, and it does so from a timer callback, not from
 * the effect body.
 */
function StatusMessage({
  status,
  messageHe,
}: {
  status: 'idle' | 'success' | 'error';
  messageHe: string;
}) {
  const messageKey = `${status}:${messageHe}`;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const visible = status !== 'idle' && messageHe !== '' && dismissedKey !== messageKey;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setDismissedKey(messageKey), 4000);
    return () => clearTimeout(timer);
  }, [visible, messageKey]);

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        'mt-2 text-xs transition-opacity',
        status === 'error' ? 'text-danger' : 'text-success',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {visible ? messageHe : ' '}
    </p>
  );
}
