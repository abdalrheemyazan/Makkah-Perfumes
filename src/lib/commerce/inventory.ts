import type { Prisma } from '@/generated/prisma/client';

/**
 * The single source of truth for "how many units can actually be sold".
 *
 * Every surface — product cards, the product page, add-to-cart, checkout, admin
 * display, low-stock and the restock trigger — must derive availability from
 * this one formula so they can never drift apart:
 *
 *     availableQuantity = quantityOnHand - quantityReserved
 *
 * `quantityOnHand` alone is never the answer while reserved stock exists: units
 * held for open orders are physically present but already spoken for.
 */

export type InventoryLike = {
  quantityOnHand: number;
  quantityReserved: number;
  allowBackorder?: boolean | null;
} | null | undefined;

/** Sellable units right now, floored at zero for display. Never negative. */
export function availableQuantity(inventory: InventoryLike): number {
  if (!inventory) return 0;
  return Math.max(0, inventory.quantityOnHand - inventory.quantityReserved);
}

/**
 * Raw (possibly negative) available quantity. Used only where the sign matters —
 * restock-transition detection and reconciliation — never for display.
 */
export function rawAvailable(quantityOnHand: number, quantityReserved: number): number {
  return quantityOnHand - quantityReserved;
}

/** True when at least one unit can be bought, honouring backorder. */
export function isInStock(inventory: InventoryLike): boolean {
  if (!inventory) return false;
  if (inventory.allowBackorder) return true;
  return inventory.quantityOnHand - inventory.quantityReserved > 0;
}

/**
 * The restock transition, defined exactly once (Part 10):
 *
 *   previously unavailable:  quantityOnHand - quantityReserved <= 0
 *   now available:           quantityOnHand - quantityReserved  > 0
 *
 * Returns true only on that edge, so editing stock while it stays positive does
 * not re-fire notifications.
 */
export function crossedIntoStock(
  before: { quantityOnHand: number; quantityReserved: number },
  after: { quantityOnHand: number; quantityReserved: number },
): boolean {
  const beforeAvailable = rawAvailable(before.quantityOnHand, before.quantityReserved);
  const afterAvailable = rawAvailable(after.quantityOnHand, after.quantityReserved);
  return beforeAvailable <= 0 && afterAvailable > 0;
}

/**
 * Atomically reserves `quantity` units of one inventory row, or refuses.
 *
 * This is the concurrency guarantee for the whole shop. A plain read-then-write
 * ("is there enough? yes → increment") lets two checkouts racing for the last
 * bottle both pass the read and both increment, overselling. Instead we push the
 * check *into* the write as a conditional `UPDATE … WHERE available >= qty`.
 *
 * Under PostgreSQL READ COMMITTED the second concurrent UPDATE blocks on the
 * row lock the first holds, then re-evaluates its WHERE against the just-committed
 * row (EvalPlanQual). So exactly one of two racers reserves the last unit; the
 * other matches zero rows and is rejected. Stock can never go negative.
 *
 * @returns true if the reservation was made, false if stock was insufficient.
 */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "quantityReserved" = "quantityReserved" + ${quantity}
    WHERE "id" = ${inventoryItemId}
      AND ("allowBackorder" = true
           OR "quantityOnHand" - "quantityReserved" >= ${quantity})
  `;
  return affected === 1;
}
