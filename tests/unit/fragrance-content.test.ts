import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FRAGRANCE_CONTENT } from '@/lib/fragrance-content';

const expectedCounts: Record<string, number> = {
  'royal-leather': 6,
  'blossom-candy': 10,
  'oud-embrace': 9,
  luban: 14,
  'amber-incense': 5,
  'pure-essence': 9,
  'luxe-rose': 4,
  'amour-touch': 10,
  adventure: 10,
  'storm-blue': 12,
  courage: 8,
  atheel: 6,
  'precious-vanilla': 8,
};

describe('verified fragrance source map', () => {
  it('contains exactly the 13 requested products with original non-placeholder Hebrew copy', () => {
    expect(FRAGRANCE_CONTENT).toHaveLength(13);
    expect(new Set(FRAGRANCE_CONTENT.map((item) => item.slug))).toEqual(new Set(Object.keys(expectedCounts)));
    for (const item of FRAGRANCE_CONTENT) {
      expect(item.descriptionHe.length).toBeGreaterThan(80);
      expect(item.descriptionHe).not.toMatch(/טרם|תצלום המוצר בלבד|Fragrantica/i);
      expect(item.notes).toHaveLength(expectedCounts[item.slug]);
      expect(item.sourceUrl).toMatch(/^https:\/\/www\.fragrantica\.com\/perfume\/Makkah-Perfumes\//);
    }
  });

  it('keeps flat-note products flat and every other product as a real pyramid', () => {
    const flat = FRAGRANCE_CONTENT.filter((item) => item.noteStructure === 'KEY');
    expect(flat.map((item) => item.slug).sort()).toEqual(['amber-incense', 'luxe-rose']);
    for (const item of flat) expect(new Set(item.notes.map((note) => note.tier))).toEqual(new Set(['KEY']));

    for (const item of FRAGRANCE_CONTENT.filter((entry) => entry.noteStructure === 'PYRAMID')) {
      expect(new Set(item.notes.map((note) => note.tier))).toEqual(new Set(['TOP', 'HEART', 'BASE']));
    }
  });

  it('renders verified metadata and key notes without importing source-site ratings or reviews', () => {
    const productPage = readFileSync(join(process.cwd(), 'src/app/(site)/shop/[slug]/page.tsx'), 'utf8');
    expect(productPage).toContain("noteStructure === 'KEY'");
    expect(productPage).toContain('תווי מפתח');
    expect(productPage).toContain('שנת השקה');
    expect(productPage).toContain('הבשמים');
    expect(productPage).not.toContain('Fragrantica');
  });

  it('provides a guarded, exact-slug, idempotent update path and source document', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/update-fragrance-content.ts'), 'utf8');
    const seed = readFileSync(join(process.cwd(), 'prisma/seed.ts'), 'utf8');
    const sources = readFileSync(join(process.cwd(), 'docs/PRODUCT_CONTENT_SOURCES.md'), 'utf8');
    expect(script).toContain('ALLOW_PRODUCTION_PRODUCT_CONTENT_UPDATE');
    expect(script).toContain('UPDATE VERIFIED FRAGRANCE CONTENT');
    expect(script).toContain("args.has('--dry-run')");
    expect(script).toContain("args.has('--confirm')");
    expect(script).toContain('where: { slug: { in: slugs } }');
    expect(script).not.toContain('priceAgorot:');
    expect(seed).not.toContain('תיאור רשמי טרם התקבל');
    expect(sources).toContain('לא הועתקו ביקורות, דירוגים, טענות עמידות, הקרנה');
  });
});
