/**
 * Rebuilds the PNG and WebP derivatives of the official product packshots.
 *
 * Why this exists: the packshots are AVIF with a *separate alpha auxiliary
 * item*. ffmpeg's AVIF decoder silently drops that channel and flattens the
 * cutout onto black, which produced opaque rgb24 PNGs. sharp (libvips) decodes
 * the alpha correctly.
 *
 *   node scripts/build-brand-derivatives.mjs
 */
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'brand-reference', 'products');

const files = (await readdir(dir)).filter((name) => name.endsWith('.avif'));
if (files.length === 0) throw new Error(`no .avif packshots found in ${dir}`);

let failures = 0;

for (const file of files) {
  const slug = file.replace(/\.avif$/, '');
  const source = join(dir, file);

  // PNG — lossless, keeps alpha, used as the generation/compositing input.
  await sharp(source).png({ compressionLevel: 9 }).toFile(join(dir, `${slug}.png`));

  // WebP — alpha preserved, browser fallback for AVIF.
  await sharp(source).webp({ quality: 92, alphaQuality: 100 }).toFile(join(dir, `${slug}.webp`));

  // Verify rather than assume: an opaque result here is a silent data loss bug.
  const png = await sharp(join(dir, `${slug}.png`)).metadata();
  const webp = await sharp(join(dir, `${slug}.webp`)).metadata();
  const ok = png.hasAlpha && webp.hasAlpha;
  if (!ok) failures += 1;

  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${slug.padEnd(20)} png alpha=${png.hasAlpha} webp alpha=${webp.hasAlpha}`,
  );
}

console.log(`\n${files.length} packshots processed, ${failures} without alpha`);
if (failures > 0) process.exit(1);
