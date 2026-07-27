import { describe, expect, it } from 'vitest';
import { isValidCouponCode, normalizeCouponCode } from '@/lib/commerce/coupon-code';
import { calculateCartTotals, evaluateCoupon, type CouponRules } from '@/lib/commerce/pricing';

const base: CouponRules = {
  code: 'WELCOME10',
  discountType: 'PERCENTAGE',
  discountValue: 10,
  minSubtotalAgorot: null,
  maxDiscountAgorot: null,
  usageLimit: null,
  usageCount: 0,
  perUserLimit: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
};

describe('normalizeCouponCode', () => {
  it('trims, removes spaces and uppercases', () => {
    expect(normalizeCouponCode('  welcome10 ')).toBe('WELCOME10');
    expect(normalizeCouponCode('wel come')).toBe('WELCOME');
  });
  it('validates allowed characters', () => {
    expect(isValidCouponCode('WELCOME10')).toBe(true);
    expect(isValidCouponCode('SUMMER-2026')).toBe(true);
    expect(isValidCouponCode('שלום')).toBe(false);
    expect(isValidCouponCode('A')).toBe(false); // too short
  });
});

describe('evaluateCoupon', () => {
  it('applies a percentage discount', () => {
    const r = evaluateCoupon(base, 10000);
    expect(r).toEqual({ ok: true, discountAgorot: 1000, freeShipping: false });
  });
  it('applies a fixed discount', () => {
    const r = evaluateCoupon({ ...base, discountType: 'FIXED_AMOUNT', discountValue: 2500 }, 10000);
    expect(r).toEqual({ ok: true, discountAgorot: 2500, freeShipping: false });
  });
  it('rejects an inactive coupon', () => {
    expect(evaluateCoupon({ ...base, isActive: false }, 10000)).toEqual({ ok: false, reasonHe: 'הקופון אינו פעיל כרגע' });
  });
  it('rejects an expired coupon', () => {
    expect(evaluateCoupon({ ...base, endsAt: new Date('2020-01-01') }, 10000)).toEqual({
      ok: false,
      reasonHe: 'תוקף הקופון הסתיים',
    });
  });
  it('enforces the minimum subtotal', () => {
    expect(evaluateCoupon({ ...base, minSubtotalAgorot: 20000 }, 10000)).toEqual({
      ok: false,
      reasonHe: 'סכום ההזמנה אינו עומד בתנאי הקופון',
    });
  });
  it('enforces the global usage limit', () => {
    expect(evaluateCoupon({ ...base, usageLimit: 5, usageCount: 5 }, 10000)).toEqual({
      ok: false,
      reasonHe: 'לא ניתן להשתמש בקופון זה יותר',
    });
  });
  it('enforces the per-user limit', () => {
    expect(evaluateCoupon({ ...base, perUserLimit: 1 }, 10000, { userRedemptionCount: 1 })).toEqual({
      ok: false,
      reasonHe: 'לא ניתן להשתמש בקופון זה יותר',
    });
  });
  it('never lets the discount exceed the subtotal (no negative total)', () => {
    const r = evaluateCoupon({ ...base, discountType: 'FIXED_AMOUNT', discountValue: 99999 }, 5000);
    expect(r).toEqual({ ok: true, discountAgorot: 5000, freeShipping: false });
  });
});

describe('calculateCartTotals (server-authoritative)', () => {
  const lines = [{ variantId: 'v1', unitPriceAgorot: 10000, quantity: 1 }];

  it('recomputes the discount and total from the coupon rules, not the client', () => {
    const totals = calculateCartTotals({ lines, coupon: base });
    expect(totals.subtotalAgorot).toBe(10000);
    expect(totals.discountAgorot).toBe(1000);
    expect(totals.totalAgorot).toBe(9000);
    expect(totals.appliedCouponCode).toBe('WELCOME10');
  });

  it('does not assume shipping on the cart (no delivery method)', () => {
    const totals = calculateCartTotals({ lines, coupon: null });
    expect(totals.shippingAgorot).toBe(0);
    expect(totals.totalAgorot).toBe(10000);
  });

  it('surfaces a coupon error and applies no discount when invalid', () => {
    const totals = calculateCartTotals({ lines, coupon: { ...base, isActive: false } });
    expect(totals.discountAgorot).toBe(0);
    expect(totals.couponErrorHe).toBe('הקופון אינו פעיל כרגע');
    expect(totals.appliedCouponCode).toBeNull();
  });

  it('never produces a negative total', () => {
    const totals = calculateCartTotals({
      lines,
      coupon: { ...base, discountType: 'FIXED_AMOUNT', discountValue: 999999 },
    });
    expect(totals.totalAgorot).toBe(0);
  });
});
