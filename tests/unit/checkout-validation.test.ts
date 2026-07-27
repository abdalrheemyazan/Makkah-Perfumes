import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkoutSchema, fieldErrors } from '@/lib/validation';

const contact = {
  email: 'buyer@example.com',
  firstName: 'ישראל',
  lastName: 'ישראלי',
  phone: '050-123-4567',
};

function payload(shippingMethod: string, address: Record<string, string> = {}) {
  return {
    email: contact.email,
    shippingMethod,
    customerNote: '',
    address: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      street: '',
      houseNumber: '',
      apartment: '',
      entrance: '',
      floor: '',
      city: '',
      postalCode: '',
      notes: '',
      ...address,
    },
  };
}

describe('checkout validation by shipping method', () => {
  it('SELF_PICKUP succeeds with only contact fields (no address)', () => {
    const r = checkoutSchema.safeParse(payload('SELF_PICKUP'));
    expect(r.success).toBe(true);
  });

  it('REGULAR requires a delivery address', () => {
    const r = checkoutSchema.safeParse(payload('REGULAR'));
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs['address.street']).toBeTruthy();
      expect(errs['address.city']).toBeTruthy();
    }
  });

  it('EXPRESS requires a delivery address', () => {
    const r = checkoutSchema.safeParse(payload('EXPRESS'));
    expect(r.success).toBe(false);
  });

  it('REGULAR succeeds once the address is provided', () => {
    const r = checkoutSchema.safeParse(
      payload('REGULAR', { street: 'הרצל', houseNumber: '10', city: 'תל אביב' }),
    );
    expect(r.success).toBe(true);
  });

  it('still requires contact fields for SELF_PICKUP', () => {
    const bad = payload('SELF_PICKUP');
    bad.address.phone = '12'; // invalid
    expect(checkoutSchema.safeParse(bad).success).toBe(false);
  });
});

describe('checkout form does not error before submit', () => {
  const src = readFileSync(join(process.cwd(), 'src/components/checkout/checkout-form.tsx'), 'utf8');
  it('only shows the error banner when the action returned an error', () => {
    expect(src).toContain("state.status === 'error'");
    // Self-pickup is the default so address fields are not rendered initially.
    expect(src).toContain("useState<ShippingMethod>('SELF_PICKUP')");
    expect(src).toContain('needsAddress');
  });
});

describe('favicon and PWA icon assets exist', () => {
  for (const f of ['src/app/icon.png', 'src/app/apple-icon.png', 'src/app/favicon.ico', 'public/icons/icon-192.png', 'public/icons/icon-512.png', 'public/icons/maskable-512.png']) {
    it(`exists: ${f}`, () => expect(existsSync(join(process.cwd(), f))).toBe(true));
  }
});

describe('header greeting uses the name, not the role', () => {
  const layout = readFileSync(join(process.cwd(), 'src/app/(site)/layout.tsx'), 'utf8');
  it('derives the display name from firstName', () => {
    expect(layout).toContain('user?.firstName');
    // The role label map must not feed the greeting.
    expect(layout).not.toContain('ROLE_LABELS');
  });
});
