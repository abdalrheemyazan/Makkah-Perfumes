/**
 * Money handling for MAKKAH PERFUMES.
 *
 * Every monetary value in this codebase is an integer number of *agorot*
 * (1 ILS = 100 agorot). Floating-point shekels are never stored, never sent
 * over the wire, and never used in arithmetic — 0.1 + 0.2 !== 0.3 is not an
 * acceptable failure mode for an order total.
 */

export const CURRENCY = 'ILS' as const;
export const LOCALE = 'he-IL' as const;

/** Thrown when a value that must be a whole number of agorot is not. */
export class MoneyError extends Error {}

function assertAgorot(value: number, label = 'amount'): void {
  if (!Number.isFinite(value)) {
    throw new MoneyError(`${label} must be a finite number, received ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError(`${label} must be an integer number of agorot, received ${value}`);
  }
}

/** Converts a shekel amount (e.g. from an admin form) into agorot. */
export function shekelsToAgorot(shekels: number): number {
  if (!Number.isFinite(shekels)) {
    throw new MoneyError(`shekels must be a finite number, received ${shekels}`);
  }
  return Math.round(shekels * 100);
}

/** Converts agorot into a shekel number. Display only — never for arithmetic. */
export function agorotToShekels(agorot: number): number {
  assertAgorot(agorot);
  return agorot / 100;
}

/**
 * Formats agorot as Hebrew-locale currency, e.g. 14990 -> "‏149.90 ₪".
 * Uses Intl so the shekel sign and RTL marks are placed correctly.
 */
export function formatPrice(agorot: number): string {
  assertAgorot(agorot);
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(agorot / 100);
}

/** Formats a plain number in he-IL (e.g. quantities, counts). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/**
 * Applies a percentage discount to an amount.
 * Rounds half-up on the discount so the customer is never charged a stray agora.
 */
export function percentageOf(agorot: number, percent: number): number {
  assertAgorot(agorot);
  if (percent < 0 || percent > 100) {
    throw new MoneyError(`percent must be between 0 and 100, received ${percent}`);
  }
  return Math.round((agorot * percent) / 100);
}

/** Sums a list of agorot amounts, validating each one. */
export function sumAgorot(amounts: readonly number[]): number {
  return amounts.reduce<number>((total, amount) => {
    assertAgorot(amount);
    return total + amount;
  }, 0);
}

/** Clamps an amount to be at least zero — totals must never go negative. */
export function clampToZero(agorot: number): number {
  assertAgorot(agorot);
  return agorot < 0 ? 0 : agorot;
}
