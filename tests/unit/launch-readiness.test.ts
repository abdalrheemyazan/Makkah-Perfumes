import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

/**
 * Header order (Part 1). Without a React renderer configured, we assert the DOM
 * order in source: in the RTL utility bar the DOM order (inner→outer) must be
 * cart · search · wishlist · account/login, so the visual far-left item is the
 * account/login control, which must be desktop-gated (mobile uses the drawer).
 */
describe('header utility order', () => {
  const src = readFileSync(join(root, 'src/components/layout/site-header.tsx'), 'utf8');
  const iCart = src.indexOf('href="/cart"');
  const iSearch = src.indexOf('href="/search"');
  const iWishlist = src.indexOf('href="/wishlist"');
  const iAccountBlock = src.indexOf('Far-left account/login control');

  it('orders cart → search → wishlist in the utility bar', () => {
    expect(iCart).toBeGreaterThan(-1);
    expect(iCart).toBeLessThan(iSearch);
    expect(iSearch).toBeLessThan(iWishlist);
  });

  it('places the account/login control after wishlist (far-left in RTL)', () => {
    expect(iAccountBlock).toBeGreaterThan(iWishlist);
  });

  it('gates the desktop account/login control to large screens', () => {
    // Signed-in menu wrapper and signed-out link are both desktop-only.
    expect(src).toContain('hidden lg:block');
    expect(/href="\/login"[\s\S]{0,200}lg:flex/.test(src)).toBe(true);
  });

  it('keeps the login label text alongside the icon', () => {
    expect(src).toContain('<span>התחברות</span>');
  });
});

/**
 * Public content audit (Part 8/16). No placeholder, lorem, TODO/FIXME, debugger,
 * or hardcoded localhost URLs in customer-facing pages and components.
 */
describe('public content is launch-clean', () => {
  const dirs = ['src/app/(site)', 'src/components'];
  const files: string[] = [];
  for (const dir of dirs) {
    const base = join(root, dir);
    for (const rel of readdirSync(base, { recursive: true }) as string[]) {
      if (/\.(tsx|ts)$/.test(rel)) files.push(join(base, rel));
    }
  }

  const forbidden: { label: string; re: RegExp }[] = [
    { label: 'lorem ipsum', re: /lorem\s+ipsum/i },
    { label: 'TODO/FIXME/HACK marker', re: /\b(TODO|FIXME|HACK|XXX)\b/ },
    { label: 'debugger statement', re: /\bdebugger\b/ },
    { label: 'hardcoded localhost URL', re: /https?:\/\/localhost/i },
    { label: 'console.log', re: /console\.log\s*\(/ },
  ];

  it('scans a meaningful number of files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const { label, re } of forbidden) {
    it(`contains no ${label}`, () => {
      const offenders = files.filter((f) => re.test(readFileSync(f, 'utf8')));
      expect(offenders.map((f) => f.replace(root, '').replace(/\\/g, '/'))).toEqual([]);
    });
  }
});
