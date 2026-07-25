'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { removeCartItem, updateCartItem } from '@/app/actions/cart';
import { CART_ACTION_INITIAL, type CartActionState } from '@/lib/action-state';
import { useCartCountStore } from '@/lib/commerce/cart-count-store';

/** Keeps the navbar badge in sync with a cart mutation's returned count. */
function useReconcileBadge(state: CartActionState) {
  const setCount = useCartCountStore((s) => s.setCount);
  useEffect(() => {
    if (state.status === 'success' && typeof state.itemCount === 'number') {
      setCount(state.itemCount);
    }
  }, [state, setCount]);
}

/**
 * Quantity stepper.
 *
 * Each button is its own submit with a fixed target quantity, so the control
 * works without JavaScript and the server remains the authority on what is
 * actually allowed.
 */
export function CartQuantityControl({
  itemId,
  quantity,
  max,
  productNameHe,
}: {
  itemId: string;
  quantity: number;
  max: number;
  productNameHe: string;
}) {
  const [state, formAction] = useActionState(updateCartItem, CART_ACTION_INITIAL);
  useReconcileBadge(state);

  return (
    <div>
      <div className="inline-flex items-center rounded-sm border border-gold/25">
        <form action={formAction}>
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="quantity" value={Math.max(0, quantity - 1)} />
          <StepButton
            label={`הפחתת כמות של ${productNameHe}`}
            disabled={quantity <= 1}
            icon={<Minus className="h-3.5 w-3.5" aria-hidden="true" />}
          />
        </form>

        <span
          className="ltr-nums grid h-9 w-10 place-items-center text-sm text-ivory"
          aria-label={`כמות: ${quantity}`}
        >
          {quantity}
        </span>

        <form action={formAction}>
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="quantity" value={quantity + 1} />
          <StepButton
            label={`הגדלת כמות של ${productNameHe}`}
            disabled={quantity >= max}
            icon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          />
        </form>
      </div>

      {state.status === 'error' && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {state.messageHe}
        </p>
      )}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  icon,
}: {
  label: string;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="grid h-9 w-9 place-items-center text-cream transition-colors hover:text-gold disabled:opacity-35"
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function RemoveCartItem({
  itemId,
  productNameHe,
}: {
  itemId: string;
  productNameHe: string;
}) {
  const [state, formAction] = useActionState(removeCartItem, CART_ACTION_INITIAL);
  useReconcileBadge(state);

  return (
    <form action={formAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <RemoveButton productNameHe={productNameHe} />
    </form>
  );
}

function RemoveButton({ productNameHe }: { productNameHe: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      הסרה
      <span className="sr-only">של {productNameHe} מהעגלה</span>
    </button>
  );
}
