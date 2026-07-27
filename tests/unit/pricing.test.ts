import { describe, expect, it } from 'vitest';
import {
  agorotToShekels,
  clampToZero,
  formatPrice,
  MoneyError,
  percentageOf,
  shekelsToAgorot,
  sumAgorot,
} from '@/lib/commerce/money';
import {
  calculateCartTotals,
  evaluateCoupon,
  priceLine,
  shippingFor,
  type CouponRules,
} from '@/lib/commerce/pricing';

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

describe('money', () => {
  it('converts shekels to agorot without floating-point drift', () => {
    expect(shekelsToAgorot(149.9)).toBe(14990);
    expect(shekelsToAgorot(0.1 + 0.2)).toBe(30);
    expect(shekelsToAgorot(1999.99)).toBe(199999);
  });

  it('round-trips agorot to shekels', () => {
    expect(agorotToShekels(14990)).toBe(149.9);
  });

  it('rejects non-integer agorot rather than silently rounding', () => {
    expect(() => agorotToShekels(10.5)).toThrow(MoneyError);
    expect(() => sumAgorot([100, 5.5])).toThrow(MoneyError);
    expect(() => formatPrice(Number.NaN)).toThrow(MoneyError);
  });

  it('formats prices in he-IL with the shekel sign', () => {
    const formatted = formatPrice(14990);
    expect(formatted).toContain('₪');
    expect(formatted).toContain('149.90');
  });

  it('rounds percentages to whole agorot', () => {
    // 10% of 33.33 ILS = 3.333 ILS -> 333 agorot
    expect(percentageOf(3333, 10)).toBe(333);
    expect(percentageOf(14990, 10)).toBe(1499);
    expect(percentageOf(101, 50)).toBe(51); // half-up
  });

  it('rejects out-of-range percentages', () => {
    expect(() => percentageOf(1000, -5)).toThrow(MoneyError);
    expect(() => percentageOf(1000, 101)).toThrow(MoneyError);
  });

  it('clamps negatives to zero', () => {
    expect(clampToZero(-500)).toBe(0);
    expect(clampToZero(500)).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Line pricing
// ---------------------------------------------------------------------------

describe('priceLine', () => {
  it('multiplies unit price by quantity', () => {
    expect(priceLine({ variantId: 'v1', unitPriceAgorot: 14990, quantity: 3 }).lineTotalAgorot).toBe(
      44970,
    );
  });

  it('rejects a non-positive or fractional quantity', () => {
    expect(() => priceLine({ variantId: 'v1', unitPriceAgorot: 100, quantity: 0 })).toThrow();
    expect(() => priceLine({ variantId: 'v1', unitPriceAgorot: 100, quantity: -1 })).toThrow();
    expect(() => priceLine({ variantId: 'v1', unitPriceAgorot: 100, quantity: 1.5 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

const baseCoupon: CouponRules = {
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

describe('evaluateCoupon', () => {
  it('applies a percentage discount', () => {
    const result = evaluateCoupon(baseCoupon, 20000);
    expect(result).toEqual({ ok: true, discountAgorot: 2000, freeShipping: false });
  });

  it('applies a fixed discount', () => {
    const result = evaluateCoupon(
      { ...baseCoupon, discountType: 'FIXED_AMOUNT', discountValue: 5000 },
      20000,
    );
    expect(result).toEqual({ ok: true, discountAgorot: 5000, freeShipping: false });
  });

  it('caps the discount at maxDiscountAgorot', () => {
    const result = evaluateCoupon({ ...baseCoupon, discountValue: 50, maxDiscountAgorot: 3000 }, 20000);
    expect(result).toMatchObject({ ok: true, discountAgorot: 3000 });
  });

  it('never discounts more than the subtotal', () => {
    const result = evaluateCoupon(
      { ...baseCoupon, discountType: 'FIXED_AMOUNT', discountValue: 99999 },
      10000,
    );
    expect(result).toMatchObject({ ok: true, discountAgorot: 10000 });
  });

  it('rejects an inactive coupon', () => {
    expect(evaluateCoupon({ ...baseCoupon, isActive: false }, 20000)).toMatchObject({
      ok: false,
      reasonHe: 'הקופון אינו פעיל כרגע',
    });
  });

  it('rejects a coupon outside its date window', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    expect(
      evaluateCoupon({ ...baseCoupon, startsAt: new Date('2026-08-01') }, 20000, { now }),
    ).toMatchObject({ ok: false, reasonHe: 'הקופון אינו פעיל כרגע' });

    expect(
      evaluateCoupon({ ...baseCoupon, endsAt: new Date('2026-07-01') }, 20000, { now }),
    ).toMatchObject({ ok: false, reasonHe: 'תוקף הקופון הסתיים' });
  });

  it('rejects an exhausted coupon', () => {
    expect(
      evaluateCoupon({ ...baseCoupon, usageLimit: 5, usageCount: 5 }, 20000),
    ).toMatchObject({ ok: false, reasonHe: 'לא ניתן להשתמש בקופון זה יותר' });
  });

  it('enforces the per-user limit', () => {
    expect(
      evaluateCoupon({ ...baseCoupon, perUserLimit: 1 }, 20000, { userRedemptionCount: 1 }),
    ).toMatchObject({ ok: false, reasonHe: 'לא ניתן להשתמש בקופון זה יותר' });
  });

  it('enforces the minimum subtotal', () => {
    expect(
      evaluateCoupon({ ...baseCoupon, minSubtotalAgorot: 30000 }, 20000),
    ).toMatchObject({ ok: false, reasonHe: 'סכום ההזמנה אינו עומד בתנאי הקופון' });
  });

  it('reports free shipping without a monetary discount', () => {
    expect(
      evaluateCoupon({ ...baseCoupon, discountType: 'FREE_SHIPPING', discountValue: 0 }, 5000),
    ).toEqual({ ok: true, discountAgorot: 0, freeShipping: true });
  });
});

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

describe('shippingFor', () => {
  it('is free for store pickup', () => {
    expect(shippingFor('STORE_PICKUP', 1000)).toBe(0);
  });

  it('charges exact 2500 agorot for regular shipping', () => {
    expect(shippingFor('REGULAR', 1000)).toBe(2500);
    expect(shippingFor('STANDARD_DELIVERY', 1000)).toBe(2500);
  });

  it('charges exact 5000 agorot for express shipping', () => {
    expect(shippingFor('EXPRESS', 1000)).toBe(5000);
    expect(shippingFor('EXPRESS_DELIVERY', 1000)).toBe(5000);
  });

  it('honours a free-shipping coupon', () => {
    expect(shippingFor('EXPRESS', 1000, { freeShipping: true })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cart totals & Controlled Calculation Verification
// ---------------------------------------------------------------------------

describe('calculateCartTotals', () => {
  const lines = [
    { variantId: 'a', unitPriceAgorot: 14990, quantity: 2 }, // 29980
    { variantId: 'b', unitPriceAgorot: 9900, quantity: 1 }, //   9900
  ];

  it('sums lines and adds express shipping', () => {
    const totals = calculateCartTotals({ lines, deliveryMethod: 'EXPRESS_DELIVERY' });
    expect(totals.subtotalAgorot).toBe(39880);
    expect(totals.discountAgorot).toBe(0);
    expect(totals.shippingAgorot).toBe(5000);
    expect(totals.totalAgorot).toBe(39880 + 5000);
  });

  it('applies regular shipping', () => {
    const totals = calculateCartTotals({ lines, deliveryMethod: 'STANDARD_DELIVERY' });
    expect(totals.shippingAgorot).toBe(2500);
    expect(totals.totalAgorot).toBe(39880 + 2500);
  });

  it('applies a valid coupon and reports the code', () => {
    const totals = calculateCartTotals({
      lines,
      coupon: baseCoupon,
      deliveryMethod: 'STANDARD_DELIVERY',
    });
    expect(totals.discountAgorot).toBe(3988);
    expect(totals.appliedCouponCode).toBe('WELCOME10');
    expect(totals.couponErrorHe).toBeNull();
    expect(totals.totalAgorot).toBe(39880 - 3988 + 2500);
  });

  it('reports a rejected coupon without altering the total', () => {
    const totals = calculateCartTotals({
      lines,
      coupon: { ...baseCoupon, isActive: false },
      deliveryMethod: 'STANDARD_DELIVERY',
    });
    expect(totals.discountAgorot).toBe(0);
    expect(totals.appliedCouponCode).toBeNull();
    expect(totals.couponErrorHe).toBe('הקופון אינו פעיל כרגע');
    expect(totals.totalAgorot).toBe(39880 + 2500);
  });

  it('verifies controlled calculations A, B, C, D', () => {
    const singleProductLines = [{ variantId: 'p1', unitPriceAgorot: 44900, quantity: 1 }];
    const percentCoupon: CouponRules = {
      code: 'LAUNCH10',
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

    // Example A: Subtotal 449.00, Regular Shipping 25.00 -> Total 474.00
    const calcA = calculateCartTotals({ lines: singleProductLines, deliveryMethod: 'STANDARD_DELIVERY' });
    expect(calcA.subtotalAgorot).toBe(44900);
    expect(calcA.discountAgorot).toBe(0);
    expect(calcA.shippingAgorot).toBe(2500);
    expect(calcA.totalAgorot).toBe(47400);

    // Example B: Subtotal 449.00, Express Shipping 50.00 -> Total 499.00
    const calcB = calculateCartTotals({ lines: singleProductLines, deliveryMethod: 'EXPRESS_DELIVERY' });
    expect(calcB.subtotalAgorot).toBe(44900);
    expect(calcB.discountAgorot).toBe(0);
    expect(calcB.shippingAgorot).toBe(5000);
    expect(calcB.totalAgorot).toBe(49900);

    // Example C: Subtotal 449.00, Coupon 44.90, Regular Shipping 25.00 -> Total 429.10
    const calcC = calculateCartTotals({ lines: singleProductLines, coupon: percentCoupon, deliveryMethod: 'STANDARD_DELIVERY' });
    expect(calcC.subtotalAgorot).toBe(44900);
    expect(calcC.discountAgorot).toBe(4490);
    expect(calcC.shippingAgorot).toBe(2500);
    expect(calcC.totalAgorot).toBe(42910);

    // Example D: Subtotal 449.00, Coupon 44.90, Express Shipping 50.00 -> Total 454.10
    const calcD = calculateCartTotals({ lines: singleProductLines, coupon: percentCoupon, deliveryMethod: 'EXPRESS_DELIVERY' });
    expect(calcD.subtotalAgorot).toBe(44900);
    expect(calcD.discountAgorot).toBe(4490);
    expect(calcD.shippingAgorot).toBe(5000);
    expect(calcD.totalAgorot).toBe(45410);
  });

  it('never produces a negative total', () => {
    const totals = calculateCartTotals({
      lines: [{ variantId: 'a', unitPriceAgorot: 1000, quantity: 1 }],
      coupon: { ...baseCoupon, discountType: 'FIXED_AMOUNT', discountValue: 999999 },
      deliveryMethod: 'STORE_PICKUP',
    });
    expect(totals.totalAgorot).toBe(0);
  });

  it('produces an empty-cart total of zero for pickup', () => {
    const totals = calculateCartTotals({ lines: [], deliveryMethod: 'STORE_PICKUP' });
    expect(totals.subtotalAgorot).toBe(0);
    expect(totals.totalAgorot).toBe(0);
  });
});
