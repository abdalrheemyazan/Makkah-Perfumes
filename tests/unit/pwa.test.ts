import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';

/**
 * PWA manifest validity and icon-set completeness. Guards against a manifest that
 * silently loses a required field or an icon file that was never generated.
 */

const root = process.cwd();

describe('web app manifest', () => {
  const m = manifest();

  it('has the required identity fields', () => {
    expect(m.name).toBe('Makkah Perfumes');
    expect(m.short_name).toBe('Makkah');
    expect(m.description && m.description.length).toBeGreaterThan(0);
  });

  it('is a standalone, RTL, Hebrew, portrait app scoped to the root', () => {
    expect(m.start_url).toBe('/');
    expect(m.scope).toBe('/');
    expect(m.display).toBe('standalone');
    expect(m.orientation).toBe('portrait-primary');
    expect(m.lang).toBe('he');
    expect(m.dir).toBe('rtl');
  });

  it('uses the brand dark theme and background', () => {
    expect(m.theme_color).toBe('#0b0a08');
    expect(m.background_color).toBe('#0b0a08');
  });

  it('declares shopping/lifestyle categories', () => {
    expect(m.categories).toContain('shopping');
    expect(m.categories).toContain('lifestyle');
  });

  it('provides any + maskable icons at 192 and 512', () => {
    const icons = m.icons ?? [];
    const has = (sizes: string, purpose: string) =>
      icons.some((i) => i.sizes === sizes && (i.purpose ?? 'any') === purpose);
    expect(has('192x192', 'any')).toBe(true);
    expect(has('512x512', 'any')).toBe(true);
    expect(has('192x192', 'maskable')).toBe(true);
    expect(has('512x512', 'maskable')).toBe(true);
  });
});

describe('generated icon files', () => {
  const files = [
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/maskable-192.png',
    'public/icons/maskable-512.png',
    'public/apple-touch-icon.png',
  ];
  for (const file of files) {
    it(`exists: ${file}`, () => {
      expect(existsSync(join(root, file))).toBe(true);
    });
  }
});
