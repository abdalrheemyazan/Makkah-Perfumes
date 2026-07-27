import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isInstallHomepage } from '@/lib/pwa-install';

describe('isInstallHomepage', () => {
  it('is true only for the homepage', () => {
    expect(isInstallHomepage('/')).toBe(true);
  });

  it.each(['/shop', '/shop/royal-leather', '/cart', '/checkout', '/account', '/account/orders', '/contact', '/admin', '/login'])(
    'is false for %s',
    (path) => expect(isInstallHomepage(path)).toBe(false),
  );
});

describe('install-prompt component wiring', () => {
  const src = readFileSync(join(process.cwd(), 'src/components/pwa/install-prompt.tsx'), 'utf8');

  it('registers exactly one beforeinstallprompt listener and cleans it up', () => {
    expect((src.match(/addEventListener\('beforeinstallprompt'/g) ?? []).length).toBe(1);
    expect((src.match(/removeEventListener\('beforeinstallprompt'/g) ?? []).length).toBe(1);
  });

  it('is gated to the homepage', () => {
    expect(src).toContain('isInstallHomepage');
    expect(src).toContain('!onHomepage');
  });

  it('does not persist a dismissal (no sessionStorage, no dismissed-at timestamp)', () => {
    expect(src).not.toContain('sessionStorage');
    expect(src).not.toContain('makkah-pwa-install-shown');
    expect(src).not.toContain('makkah-pwa-install-dismissed-at');
  });

  it('still honors the installed flag', () => {
    expect(src).toContain('INSTALL_INSTALLED_KEY');
    expect(src).toContain("addEventListener('appinstalled'");
  });
});
