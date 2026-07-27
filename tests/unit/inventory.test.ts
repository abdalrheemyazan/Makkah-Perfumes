import { describe, expect, it } from 'vitest';
import {
  availableQuantity,
  crossedIntoStock,
  isInStock,
  rawAvailable,
} from '@/lib/commerce/inventory';

/**
 * Pure inventory logic — the one availability formula and the restock-transition
 * edge detector. The atomic reservation (reserveStock) is proven separately
 * against a real database in scripts/verify-inventory-concurrency.ts.
 */

describe('availableQuantity', () => {
  it('is onHand minus reserved', () => {
    expect(availableQuantity({ quantityOnHand: 10, quantityReserved: 3 })).toBe(7);
  });

  it('never reports negative availability', () => {
    expect(availableQuantity({ quantityOnHand: 2, quantityReserved: 5 })).toBe(0);
  });

  it('treats a missing inventory row as zero', () => {
    expect(availableQuantity(null)).toBe(0);
    expect(availableQuantity(undefined)).toBe(0);
  });
});

describe('isInStock', () => {
  it('is false when nothing is available and no backorder', () => {
    expect(isInStock({ quantityOnHand: 3, quantityReserved: 3 })).toBe(false);
  });

  it('is true when at least one unit is available', () => {
    expect(isInStock({ quantityOnHand: 3, quantityReserved: 2 })).toBe(true);
  });

  it('honours backorder even at zero available', () => {
    expect(isInStock({ quantityOnHand: 0, quantityReserved: 0, allowBackorder: true })).toBe(true);
  });

  it('is false for a missing inventory row', () => {
    expect(isInStock(null)).toBe(false);
  });
});

describe('rawAvailable', () => {
  it('can be negative (unlike the display formula)', () => {
    expect(rawAvailable(2, 5)).toBe(-3);
  });
});

describe('crossedIntoStock (restock transition)', () => {
  it('fires only on the 0→positive edge', () => {
    expect(
      crossedIntoStock(
        { quantityOnHand: 5, quantityReserved: 5 }, // available 0
        { quantityOnHand: 8, quantityReserved: 5 }, // available 3
      ),
    ).toBe(true);
  });

  it('fires when a reservation is released past zero', () => {
    expect(
      crossedIntoStock(
        { quantityOnHand: 1, quantityReserved: 1 }, // available 0
        { quantityOnHand: 1, quantityReserved: 0 }, // available 1
      ),
    ).toBe(true);
  });

  it('does NOT fire while stock stays positive (no re-notify on edits)', () => {
    expect(
      crossedIntoStock(
        { quantityOnHand: 5, quantityReserved: 0 }, // available 5
        { quantityOnHand: 9, quantityReserved: 0 }, // available 9
      ),
    ).toBe(false);
  });

  it('does NOT fire when it stays out of stock', () => {
    expect(
      crossedIntoStock(
        { quantityOnHand: 5, quantityReserved: 5 }, // available 0
        { quantityOnHand: 5, quantityReserved: 6 }, // available -1
      ),
    ).toBe(false);
  });

  it('does NOT fire on a positive→zero drop', () => {
    expect(
      crossedIntoStock(
        { quantityOnHand: 5, quantityReserved: 3 }, // available 2
        { quantityOnHand: 5, quantityReserved: 5 }, // available 0
      ),
    ).toBe(false);
  });
});
