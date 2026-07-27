/**
 * Coupon code normalization — pure, no server imports, so it is shared by the
 * cart action, the admin form, and the launch script, and unit-tested directly.
 *
 * Codes are compared case-insensitively: we store and match the normalized
 * (trimmed, uppercased) form, so "welcome10", "Welcome10" and " WELCOME10 " are
 * the same coupon and duplicates with different casing cannot exist.
 */

/** Trim, collapse internal whitespace, and uppercase (Latin letters). */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

/** Allowed shape after normalization: A–Z, 0–9, hyphen, underscore, 2–32 chars. */
export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{2,32}$/;

export function isValidCouponCode(code: string): boolean {
  return COUPON_CODE_PATTERN.test(code);
}
