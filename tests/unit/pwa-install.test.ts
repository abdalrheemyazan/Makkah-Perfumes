import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INSTALL_DISMISS_DURATION_MS,
  isRouteExcluded,
  parseDismissedAt,
  shouldShowInstallBanner,
} from '@/lib/pwa-install';

const base = {
  installed: false,
  standalone: false,
  excludedRoute: false,
  sessionShown: false,
  dismissedAt: null as number | null,
  now: 1_000_000_000,
};

describe('shouldShowInstallBanner', () => {
  it('shows on the first eligible visit', () => {
    expect(shouldShowInstallBanner(base)).toBe(true);
  });

  it('does not reopen once shown this session (internal navigation)', () => {
    expect(shouldShowInstallBanner({ ...base, sessionShown: true })).toBe(false);
  });

  it('never shows when installed or standalone', () => {
    expect(shouldShowInstallBanner({ ...base, installed: true })).toBe(false);
    expect(shouldShowInstallBanner({ ...base, standalone: true })).toBe(false);
  });

  it('never shows on an excluded route', () => {
    expect(shouldShowInstallBanner({ ...base, excludedRoute: true })).toBe(false);
  });

  it('stays hidden for exactly one hour after dismissal', () => {
    const dismissedAt = base.now - (INSTALL_DISMISS_DURATION_MS - 1000); // 59m59s ago
    expect(shouldShowInstallBanner({ ...base, dismissedAt })).toBe(false);
  });

  it('is allowed again after the one-hour dismissal expires', () => {
    const dismissedAt = base.now - (INSTALL_DISMISS_DURATION_MS + 1000); // 1h+ ago
    expect(shouldShowInstallBanner({ ...base, dismissedAt })).toBe(true);
  });

  it('treats a garbage dismissal value as no dismissal', () => {
    expect(parseDismissedAt('not-a-number')).toBeNull();
    expect(shouldShowInstallBanner({ ...base, dismissedAt: parseDismissedAt('x') })).toBe(true);
  });
});

describe('isRouteExcluded', () => {
  it.each(['/admin', '/admin/coupons', '/login', '/register', '/checkout', '/account', '/account/orders', '/orders', '/offline'])(
    'excludes %s',
    (path) => expect(isRouteExcluded(path)).toBe(true),
  );

  it.each(['/', '/shop', '/shop/royal-leather', '/cart', '/contact', '/collections'])(
    'allows %s',
    (path) => expect(isRouteExcluded(path)).toBe(false),
  );
});

describe('install-prompt component wiring', () => {
  const src = readFileSync(join(process.cwd(), 'src/components/pwa/install-prompt.tsx'), 'utf8');

  it("registers exactly one beforeinstallprompt listener and cleans it up", () => {
    const adds = src.match(/addEventListener\('beforeinstallprompt'/g) ?? [];
    const removes = src.match(/removeEventListener\('beforeinstallprompt'/g) ?? [];
    expect(adds.length).toBe(1);
    expect(removes.length).toBe(1);
  });

  it('sets the session-shown flag when revealing', () => {
    expect(src).toContain('INSTALL_SESSION_SHOWN_KEY');
  });
});
