'use client';

import { useActionState, useId } from 'react';
import { adjustInventory } from '@/app/actions/admin/operations';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { MOVEMENT_REASON_LABELS } from '@/lib/admin/labels';
import { SubmitButton } from './form';

const REASONS = ['MANUAL_ADJUSTMENT', 'RETURN_RESTOCK', 'DAMAGE_WRITE_OFF'] as const;

/**
 * Inline stock adjustment.
 *
 * Takes a signed delta rather than an absolute quantity: "+5 returned" is an
 * auditable event, whereas overwriting the number loses the reason and races
 * with concurrent orders.
 */
export function InventoryAdjustForm({
  inventoryItemId,
  productNameHe,
}: {
  inventoryItemId: string;
  productNameHe: string;
}) {
  const [state, formAction] = useActionState(adjustInventory, ADMIN_ACTION_INITIAL);
  const deltaId = useId();
  const reasonId = useId();

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5 md:items-start">
      <input type="hidden" name="inventoryItemId" value={inventoryItemId} />

      <div className="flex flex-wrap items-center gap-1.5">
        <label htmlFor={deltaId} className="sr-only">
          שינוי כמות עבור {productNameHe}
        </label>
        <input
          id={deltaId}
          name="delta"
          type="number"
          step="1"
          placeholder="±0"
          dir="ltr"
          required
          className="ltr-nums h-9 w-20 rounded-sm border border-gold/25 bg-ink px-2 text-center text-sm text-ivory focus:border-gold focus:outline-none"
        />

        <label htmlFor={reasonId} className="sr-only">
          סיבת השינוי
        </label>
        <select
          id={reasonId}
          name="reason"
          defaultValue="MANUAL_ADJUSTMENT"
          className="h-9 rounded-sm border border-gold/25 bg-ink px-2 text-xs text-cream focus:border-gold focus:outline-none"
        >
          {REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {MOVEMENT_REASON_LABELS[reason]}
            </option>
          ))}
        </select>

        <SubmitButton labelHe="עדכון" pendingLabelHe="…" variant="secondary" className="h-9 px-3" />
      </div>

      {state.status !== 'idle' && state.messageHe && (
        <p
          role="status"
          className={`text-xs ${state.status === 'error' ? 'text-danger' : 'text-success'}`}
        >
          {state.messageHe}
        </p>
      )}
    </form>
  );
}
