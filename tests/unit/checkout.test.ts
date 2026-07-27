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
});
