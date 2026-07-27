import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  emailDeliveryAvailable,
  publicVapidKey,
  pushDeliveryAvailable,
} from '@/lib/notifications/config';

/**
 * Channel-availability honesty: the app must only offer channels it can actually
 * use, and must never treat the dev-only console mail transport as real delivery
 * in production.
 */

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.unstubAllEnvs();
});

describe('pushDeliveryAvailable', () => {
  it('is false when VAPID keys are absent', () => {
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '');
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    vi.stubEnv('VAPID_SUBJECT', '');
    expect(pushDeliveryAvailable()).toBe(false);
  });

  it('is true only when all three VAPID values are present', () => {
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'pub');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'priv');
    vi.stubEnv('VAPID_SUBJECT', 'mailto:a@b.com');
    expect(pushDeliveryAvailable()).toBe(true);
    expect(publicVapidKey()).toBe('pub');
  });

  it('is false when only the public key is present', () => {
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'pub');
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    vi.stubEnv('VAPID_SUBJECT', '');
    expect(pushDeliveryAvailable()).toBe(false);
  });
});

describe('emailDeliveryAvailable', () => {
  it('counts the console transport as available in development', () => {
    vi.stubEnv('MAIL_TRANSPORT', 'console');
    vi.stubEnv('NODE_ENV', 'development');
    expect(emailDeliveryAvailable()).toBe(true);
  });

  it('does NOT count console transport as delivery in production', () => {
    vi.stubEnv('MAIL_TRANSPORT', 'console');
    vi.stubEnv('NODE_ENV', 'production');
    expect(emailDeliveryAvailable()).toBe(false);
  });

  it('counts a real transport as available in production', () => {
    vi.stubEnv('MAIL_TRANSPORT', 'smtp');
    vi.stubEnv('NODE_ENV', 'production');
    expect(emailDeliveryAvailable()).toBe(true);
  });
});
