import { describe, expect, it } from 'vitest';
import { checkoutSchema } from '@/lib/validation';
import { SHIPPING_METHODS, calculateCartTotals } from '@/lib/commerce/pricing';

describe('Checkout Validation & Logic', () => {
  it('has SELF_PICKUP as free and default shipping option', () => {
    expect(SHIPPING_METHODS.SELF_PICKUP).toEqual({ label: 'איסוף עצמי', amount: 0 });
    expect(SHIPPING_METHODS.REGULAR).toEqual({ label: 'משלוח רגיל', amount: 2500 });
    expect(SHIPPING_METHODS.EXPRESS).toEqual({ label: 'משלוח מהיר', amount: 5000 });
  });

  it('validates self pickup without requiring street, house number or city', () => {
    const validPickup = checkoutSchema.safeParse({
      email: 'customer@example.com',
      shippingMethod: 'SELF_PICKUP',
      address: {
        firstName: 'ישראל',
        lastName: 'ישראלי',
        phone: '0501234567',
        street: '',
        houseNumber: '',
        city: '',
      },
    });

    expect(validPickup.success).toBe(true);
  });

  it('requires delivery address fields when REGULAR or EXPRESS shipping is selected', () => {
    const invalidDelivery = checkoutSchema.safeParse({
      email: 'customer@example.com',
      shippingMethod: 'REGULAR',
      address: {
        firstName: 'ישראל',
        lastName: 'ישראלי',
        phone: '0501234567',
        street: '',
        houseNumber: '',
        city: '',
      },
    });

    expect(invalidDelivery.success).toBe(false);
    if (!invalidDelivery.success) {
      const issues = invalidDelivery.error.issues;
      expect(issues.some((i) => i.path.join('.') === 'address.street')).toBe(true);
      expect(issues.some((i) => i.path.join('.') === 'address.houseNumber')).toBe(true);
      expect(issues.some((i) => i.path.join('.') === 'address.city')).toBe(true);
    }
  });

  it('passes delivery validation when street, house number, and city are provided', () => {
    const validDelivery = checkoutSchema.safeParse({
      email: 'customer@example.com',
      shippingMethod: 'EXPRESS',
      address: {
        firstName: 'ישראל',
        lastName: 'ישראלי',
        phone: '0501234567',
        street: 'הרצל',
        houseNumber: '10',
        city: 'תל אביב',
      },
    });

    expect(validDelivery.success).toBe(true);
  });

  it('calculates exact totals matching selected shipping method', () => {
    const lines = [{ variantId: 'v1', unitPriceAgorot: 10000, quantity: 1 }];

    const pickupTotals = calculateCartTotals({ lines, deliveryMethod: 'STORE_PICKUP' });
    expect(pickupTotals.shippingAgorot).toBe(0);
    expect(pickupTotals.totalAgorot).toBe(10000);

    const regularTotals = calculateCartTotals({ lines, deliveryMethod: 'STANDARD_DELIVERY' });
    expect(regularTotals.shippingAgorot).toBe(2500);
    expect(regularTotals.totalAgorot).toBe(12500);

    const expressTotals = calculateCartTotals({ lines, deliveryMethod: 'EXPRESS_DELIVERY' });
    expect(expressTotals.shippingAgorot).toBe(5000);
    expect(expressTotals.totalAgorot).toBe(15000);
  });

  it('verifies cart totals do not include shipping charge when deliveryMethod is not provided', () => {
    const lines = [{ variantId: 'v1', unitPriceAgorot: 44900, quantity: 1 }]; // 449.00 ₪

    // 1. Cart with no coupon contains no shipping charge.
    const cartNoCoupon = calculateCartTotals({ lines, deliveryMethod: null });
    expect(cartNoCoupon.shippingAgorot).toBe(0);
    expect(cartNoCoupon.totalAgorot).toBe(44900);

    // 2. Cart with a coupon contains no shipping charge.
    const percentCoupon = {
      code: 'LAUNCH10',
      discountType: 'PERCENTAGE' as const,
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
    const cartWithCoupon = calculateCartTotals({ lines, coupon: percentCoupon, deliveryMethod: null });
    expect(cartWithCoupon.shippingAgorot).toBe(0);

    // 3. The example total is exactly 404.10 ₪.
    expect(cartWithCoupon.discountAgorot).toBe(4490); // 44.90 ₪
    expect(cartWithCoupon.totalAgorot).toBe(40410); // 404.10 ₪

    // 4. Cart never defaults to REGULAR.
    expect(cartNoCoupon.shippingAgorot).not.toBe(2500);
  });

  it('verifies checkout shipping selection updates correctly', () => {
    const lines = [{ variantId: 'v1', unitPriceAgorot: 44900, quantity: 1 }]; // 449.00 ₪
    const percentCoupon = {
      code: 'LAUNCH10',
      discountType: 'PERCENTAGE' as const,
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

    // 5. Checkout still shows all three delivery methods.
    expect(SHIPPING_METHODS.SELF_PICKUP).toBeDefined();
    expect(SHIPPING_METHODS.REGULAR).toBeDefined();
    expect(SHIPPING_METHODS.EXPRESS).toBeDefined();

    // 6. Selecting regular in checkout adds 25 ₪.
    const checkoutRegular = calculateCartTotals({ lines, coupon: percentCoupon, deliveryMethod: 'STANDARD_DELIVERY' });
    expect(checkoutRegular.shippingAgorot).toBe(2500);
    expect(checkoutRegular.totalAgorot).toBe(42910); // 404.10 + 25.00

    // 7. Selecting express in checkout adds 50 ₪.
    const checkoutExpress = calculateCartTotals({ lines, coupon: percentCoupon, deliveryMethod: 'EXPRESS_DELIVERY' });
    expect(checkoutExpress.shippingAgorot).toBe(5000);
    expect(checkoutExpress.totalAgorot).toBe(45410); // 404.10 + 50.00

    // 8. Selecting pickup in checkout adds 0 ₪.
    const checkoutPickup = calculateCartTotals({ lines, coupon: percentCoupon, deliveryMethod: 'STORE_PICKUP' });
    expect(checkoutPickup.shippingAgorot).toBe(0);
    expect(checkoutPickup.totalAgorot).toBe(40410); // 404.10 + 0

    // 9. Cart and checkout totals use the same product subtotal and coupon discount.
    const cartTotals = calculateCartTotals({ lines, coupon: percentCoupon, deliveryMethod: null });
    expect(cartTotals.subtotalAgorot).toBe(checkoutRegular.subtotalAgorot);
    expect(cartTotals.discountAgorot).toBe(checkoutRegular.discountAgorot);
  });
});
