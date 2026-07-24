/**
 * Builds transparent logo variants from the official logo.
 *
 * The supplied logo.webp is black artwork on an OPAQUE white background
 * (hasAlpha = false). Rendering it on the dark UI with a CSS `brightness-0
 * invert` filter turned the entire rectangle white — a visible white box in the
 * header. The fix is a real cutout: derive an alpha channel from the artwork's
 * own luminance so the white background becomes transparent, then tint the
 * remaining strokes.
 *
 * The artwork itself is never redrawn — only the background is removed.
 *
 *   node scripts/build-logo-variants.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'brand-reference', 'logo');
const source = join(dir, 'logo.webp');

const { width, height } = await sharp(source).metadata();
if (!width || !height) throw new Error('could not read logo dimensions');

/**
 * Alpha mask: the logo is black-on-white, so inverted luminance is exactly the
 * coverage of the artwork — opaque where the strokes are, transparent on paper.
 */
const alpha = await sharp(source).greyscale().negate().raw().toBuffer();

async function tinted(hex, name) {
  const rgb = await sharp({
    create: { width, height, channels: 3, background: hex },
  })
    .raw()
    .toBuffer();

  // Interleave RGB with the derived alpha.
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    out[i * 4] = rgb[i * 3];
    out[i * 4 + 1] = rgb[i * 3 + 1];
    out[i * 4 + 2] = rgb[i * 3 + 2];
    out[i * 4 + 3] = alpha[i];
  }

  const file = join(dir, name);
  const info = await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ width: 512, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(file);

  const meta = await sharp(file).metadata();
  console.log(
    `${name.padEnd(22)} ${info.width}x${info.height}  alpha=${meta.hasAlpha}  ${Math.round(info.size / 1024)} KB`,
  );
}

// Ivory for the dark site chrome, and near-black for any light surface
// (the packing slip prints on white paper).
await tinted('#F2EBDD', 'logo-ivory.png');
await tinted('#0B0A08', 'logo-ink.png');
