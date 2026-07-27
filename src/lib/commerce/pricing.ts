import { clampToZero, percentageOf, sumAgorot, type MoneyError } from './money';

/**
 * Server-authoritative pricing.
 *
 * The browser may *display* prices, but it never decides them. Every total that
 * ends up on an order is recomputed here from database rows immediately before
 * the order is written. Nothing price-related is trusted from the request body.
 */

export type DeliveryMethod = 'STANDARD_DELIVERY' | 'EXPRESS_DELIVERY' | 'STORE_PICKUP';
export type ShippingMethod = 'SELF_PICKUP' | 'REGULAR' | 'EXPRESS';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

/** Shared official shipping configuration */
export const SHIPPING_METHODS = {
  SELF_PICKUP: { label: 'איסוף עצמי', amount: 0 },
  REGULAR: { label: 'משלוח רגיל', amount: 2500 },
  EXPRESS: { label: 'משלוח מהיר', amount: 5000 },
} as const;

export const SHIPPING_PRICES = {
  SELF_PICKUP: 0,
  REGULAR: 2500,
  EXPRESS: 5000,
} as const;

export const DEVELOPMENT_SHIPPING_RATES: Readonly<Record<DeliveryMethod, number>> = {
  STANDARD_DELIVERY: 2500,
  EXPRESS_DELIVERY: 5000,
  STORE_PICKUP: 0,
};

/** Normalizes coupon codes to uppercase alphanumeric string */
export function normalizeCouponCode(code: string): string {
  const trimmed = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('קוד הקופון אינו תקין');
  }
  return trimmed;
}

export type PriceableLine = {
  variantId: string;
  /** Unit price read from the database, never from the client. */
  unitPriceAgorot: number;
  quantity: number;
};

export type PricedLine = PriceableLine & {
  lineTotalAgorot: number;
};

export type CouponRules = {
  code: string;
  discountType: DiscountType;
  /** Percent (1-100) for PERCENTAGE, agorot for FIXED_AMOUNT, ignored for FREE_SHIPPING. */
  discountValue: number;
  minSubtotalAgorot: number | null;
  maxDiscountAgorot: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

export type CouponEvaluation =
  | { ok: true; discountAgorot: number; freeShipping: boolean }
  | { ok: false; reasonHe: string };

/** Multiplies out one cart line. */
export function priceLine(line: PriceableLine): PricedLine {
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new Error(`quantity must be a positive integer, received ${line.quantity}`);
  }
  return {
    ...line,
    lineTotalAgorot: line.unitPriceAgorot * line.quantity,
  };
}

export function subtotalOf(lines: readonly PricedLine[]): number {
  return sumAgorot(lines.map((line) => line.lineTotalAgorot));
}

/**
 * Validates a coupon against the current cart and returns the discount it earns.
 * Returns a Hebrew reason string on failure so the UI can show it directly.
 */
export function evaluateCoupon(
  coupon: CouponRules,
  subtotalAgorot: number,
  options: { now?: Date; userRedemptionCount?: number } = {},
): CouponEvaluation {
  const now = options.now ?? new Date();
  const userRedemptions = options.userRedemptionCount ?? 0;

  if (!coupon.isActive) {
    return { ok: false, reasonHe: 'הקופון אינו פעיל כרגע' };
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    return { ok: false, reasonHe: 'הקופון אינו פעיל כרגע' };
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    return { ok: false, reasonHe: 'תוקף הקופון הסתיים' };
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, reasonHe: 'לא ניתן להשתמש בקופון זה יותר' };
  }
  if (coupon.perUserLimit !== null && userRedemptions >= coupon.perUserLimit) {
    return { ok: false, reasonHe: 'לא ניתן להשתמש בקופון זה יותר' };
  }
  if (coupon.minSubtotalAgorot !== null && subtotalAgorot < coupon.minSubtotalAgorot) {
    return { ok: false, reasonHe: 'סכום ההזמנה אינו עומד בתנאי הקופון' };
  }

  if (coupon.discountType === 'FREE_SHIPPING') {
    return { ok: true, discountAgorot: 0, freeShipping: true };
  }

  let discount =
    coupon.discountType === 'PERCENTAGE'
      ? percentageOf(subtotalAgorot, coupon.discountValue)
      : coupon.discountValue;

  if (coupon.maxDiscountAgorot !== null) {
    discount = Math.min(discount, coupon.maxDiscountAgorot);
  }
  // A discount can never exceed the subtotal — the customer is not owed money.
  discount = Math.min(discount, subtotalAgorot);

  return { ok: true, discountAgorot: clampToZero(discount), freeShipping: false };
}

export function shippingFor(
  method: DeliveryMethod | ShippingMethod,
  subtotalAfterDiscount: number,
  options: { freeShipping?: boolean } = {},
): number {
  if (options.freeShipping) return 0;
  if (method === 'STORE_PICKUP') return 0;
  if (method === 'REGULAR' || method === 'STANDARD_DELIVERY') {
    return SHIPPING_PRICES.REGULAR;
  }
  if (method === 'EXPRESS' || method === 'EXPRESS_DELIVERY') {
    return SHIPPING_PRICES.EXPRESS;
  }
  return SHIPPING_PRICES.REGULAR;
}

export type CartTotals = {
  lines: PricedLine[];
  subtotalAgorot: number;
  discountAgorot: number;
  shippingAgorot: number;
  taxAgorot: number;
  totalAgorot: number;
  appliedCouponCode: string | null;
  couponErrorHe: string | null;
};

/**
 * The single source of truth for what a cart costs.
 *
 * Tax is currently 0: whether prices include VAT has not been confirmed by the
 * client (docs/MISSING_BUSINESS_DATA.md §1.1). Israeli retail prices are
 * conventionally VAT-inclusive, so adding VAT on top would overcharge. We
 * therefore treat displayed prices as final and keep the field at zero until
 * the client confirms.
 */
export function calculateCartTotals(input: {
  lines: readonly PriceableLine[];
  coupon?: CouponRules | null;
  deliveryMethod: DeliveryMethod;
  now?: Date;
  userRedemptionCount?: number;
}): CartTotals {
  const lines = input.lines.map(priceLine);
  const subtotalAgorot = subtotalOf(lines);

  let discountAgorot = 0;
  let freeShipping = false;
  let appliedCouponCode: string | null = null;
  let couponErrorHe: string | null = null;

  if (input.coupon) {
    const evaluation = evaluateCoupon(input.coupon, subtotalAgorot, {
      now: input.now,
      userRedemptionCount: input.userRedemptionCount,
    });
    if (evaluation.ok) {
      discountAgorot = evaluation.discountAgorot;
      freeShipping = evaluation.freeShipping;
      appliedCouponCode = input.coupon.code;
    } else {
      couponErrorHe = evaluation.reasonHe;
    }
  }

  const subtotalAfterDiscount = clampToZero(subtotalAgorot - discountAgorot);
  const shippingAgorot = shippingFor(input.deliveryMethod, subtotalAfterDiscount, {
    freeShipping,
  });
  const taxAgorot = 0;
  const totalAgorot = clampToZero(subtotalAfterDiscount + shippingAgorot + taxAgorot);

  return {
    lines,
    subtotalAgorot,
    discountAgorot,
    shippingAgorot,
    taxAgorot,
    totalAgorot,
    appliedCouponCode,
    couponErrorHe,
  };
}

export type { MoneyError };
