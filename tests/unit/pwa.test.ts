import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
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

  it('replaces the known Next.js starter ICO and contains all required frames', () => {
    const ico = readFileSync(join(root, 'src/app/favicon.ico'));
    const sha256 = createHash('sha256').update(ico).digest('hex');
    expect(sha256).not.toBe('2b8ad2d33455a8f736fc3a8ebf8f0bdea8848ad4c0db48a2833bd0f9cd775932');
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    expect(count).toBe(4);
    const sizes = Array.from({ length: count }, (_, index) => {
      const raw = ico[6 + index * 16];
      return raw === 0 ? 256 : raw;
    });
    expect(sizes).toEqual([16, 32, 48, 256]);
  });

  it('serves correctly sized monogram PNGs for browser, Apple and PWA use', async () => {
    const expected = new Map([
      ['public/icons/favicon-16.png', 16],
      ['public/icons/favicon-32.png', 32],
      ['public/icons/favicon-48.png', 48],
      ['public/icons/icon-192.png', 192],
      ['public/icons/icon-512.png', 512],
      ['public/icons/maskable-512.png', 512],
      ['src/app/apple-icon.png', 180],
    ]);
    for (const [file, size] of expected) {
      const metadata = await sharp(join(root, file)).metadata();
      expect(metadata.width, file).toBe(size);
      expect(metadata.height, file).toBe(size);
      expect(metadata.format, file).toBe('png');
    }
  });
});
