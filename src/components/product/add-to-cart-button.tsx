'use client';

import { useEffect, useState, useTransition } from 'react';
import { addToCart } from '@/app/actions/cart';
import { CART_ACTION_INITIAL } from '@/lib/action-state';
import { useCartCountStore } from '@/lib/commerce/cart-count-store';
import { cn } from '@/lib/utils';

/**
 * Add-to-cart control — optimistic.
 *
 * On click the badge moves immediately (the client cart-count store is bumped
 * before the server answers) and the button shows "מוסיף לסל…". The real
 * mutation runs in a transition; on success we reconcile the badge to the
 * server's authoritative count, on failure we roll the optimistic bump back and
 * surface a Hebrew error with the button re-enabled for a retry.
 *
 * Inventory and price are still validated server-side in `addToCart` — the
 * optimistic bump is UI only, and an out-of-stock add is rejected there and
 * rolled back here, so nothing is ever truly added past stock.
 *
 * The button is disabled while pending, so a rapid double-click cannot fire two
 * mutations. The pending state is a label swap only — no size or position
 * change — so the button never moves out from under the pointer mid-click.
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
  const [pending, startTransition] = useTransition();
  const applyDelta = useCartCountStore((s) => s.applyDelta);
  const setCount = useCartCountStore((s) => s.setCount);

  const [state, setState] = useState(CART_ACTION_INITIAL);
  const [justAdded, setJustAdded] = useState(false);

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

  function handleClick() {
    // Guard against a rapid second click before the transition starts.
    if (pending) return;
    setState(CART_ACTION_INITIAL);

    // Optimistic: bump the badge now, remember the value to roll back to.
    const before = useCartCountStore.getState().count;
    applyDelta(quantity);
    setJustAdded(true);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('variantId', variantId);
      formData.set('quantity', String(quantity));

      const result = await addToCart(CART_ACTION_INITIAL, formData);

      if (result.status === 'success' && typeof result.itemCount === 'number') {
        setCount(result.itemCount); // reconcile to the server's truth
      } else if (result.status === 'error') {
        // Roll the optimistic bump back to exactly where it was.
        if (before === null) setCount(0);
        else setCount(before);
        setJustAdded(false);
      }
      setState(result);
    });
  }

  return (
    <div className={className}>
      <SubmitButton
        labelHe={labelHe}
        size={size}
        pending={pending}
        justAdded={justAdded}
        onClick={handleClick}
      />
      <StatusMessage status={state.status} messageHe={state.messageHe} />
    </div>
  );
}

function SubmitButton({
  labelHe,
  size,
  pending,
  justAdded,
  onClick,
}: {
  labelHe: string;
  size: 'sm' | 'md' | 'lg';
  pending: boolean;
  justAdded: boolean;
  onClick: () => void;
}) {
  const label = pending ? 'מוסיף לסל…' : justAdded ? 'נוסף לעגלה ✓' : labelHe;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'inline-flex w-full items-center justify-center rounded-sm bg-gold font-medium text-ink transition-colors duration-200 hover:bg-cream disabled:opacity-60',
        size === 'sm' && 'h-9 px-3 text-xs',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-13 px-7 text-base',
      )}
    >
      {label}
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
      {visible ? messageHe : ' '}
    </p>
  );
}
