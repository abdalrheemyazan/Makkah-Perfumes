/**
 * Generates every browser/PWA icon from the official circular monogram inside
 * logo-ivory.png. The wordmark is deliberately excluded at small sizes.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = join(root, 'public', 'brand-reference', 'logo', 'logo-ivory.png');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const INK = '#0b0a08';
const GOLD = '#b38a52';
// Measured transparent-source bounds of the official monogram. The wordmark
// begins below y=316, so this crop preserves only the original circular mark.
const MARK_CROP = { left: 109, top: 0, width: 294, height: 279 };

async function monogram(size) {
  const { data, info } = await sharp(logoPath)
    .extract(MARK_CROP)
    .resize(size, size, { fit: 'contain' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // The official export contains a few opaque black guide pixels around the
  // ivory artwork. Build alpha from luminance so only the visible ivory mark is
  // retained; the monogram geometry itself is unchanged.
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.max(data[i], data[i + 1], data[i + 2]);
    const sourceAlpha = data[i + 3];
    data[i] = 242;
    data[i + 1] = 235;
    data[i + 2] = 221;
    data[i + 3] = Math.round((luminance / 255) * sourceAlpha);
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

async function iconBuffer(size, style) {
  const isMaskable = style === 'maskable';
  const isApple = style === 'apple';
  const contentSize = Math.round(size * (isMaskable ? 0.48 : isApple ? 0.54 : 0.59));
  const mark = await monogram(contentSize);

  const background = isMaskable || isApple
    ? { r: 11, g: 10, b: 8, alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };

  const composites = [];
  if (!isMaskable && !isApple) {
    const diameter = Math.round(size * 0.9);
    const inset = (size - diameter) / 2;
    composites.push({
      input: Buffer.from(
        `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${diameter / 2 - Math.max(1, size * 0.012)}" fill="${INK}" stroke="${GOLD}" stroke-width="${Math.max(1, size * 0.018)}"/></svg>`,
      ),
      left: 0,
      top: 0,
    });
    void inset;
  }
  composites.push({ input: mark, gravity: 'center' });

  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite(composites)
    .png()
    .toBuffer();
}

function icoBuffer(images) {
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header[entry + 2] = 0;
    header[entry + 3] = 0;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

async function writePng(size, path, style = 'standard') {
  const data = await iconBuffer(size, style);
  writeFileSync(path, data);
  console.log(`  ✓ ${relative(root, path)} (${size}×${size})`);
  return data;
}

async function main() {
  console.log('[pwa-icons] generating from the official Makkah monogram');

  const faviconFrames = [];
  for (const size of [16, 32, 48]) {
    const data = await writePng(size, join(outDir, `favicon-${size}.png`));
    faviconFrames.push({ size, data });
  }
  faviconFrames.push({ size: 256, data: await iconBuffer(256, 'standard') });
  writeFileSync(join(root, 'src', 'app', 'favicon.ico'), icoBuffer(faviconFrames));
  console.log('  ✓ src/app/favicon.ico (16, 32, 48, 256)');

  await writePng(192, join(outDir, 'icon-192.png'));
  await writePng(512, join(outDir, 'icon-512.png'));
  await writePng(192, join(outDir, 'maskable-192.png'), 'maskable');
  await writePng(512, join(outDir, 'maskable-512.png'), 'maskable');
  await writePng(180, join(root, 'public', 'apple-touch-icon.png'), 'apple');

  await writePng(512, join(root, 'src', 'app', 'icon.png'));
  await writePng(180, join(root, 'src', 'app', 'apple-icon.png'), 'apple');

  console.log('[pwa-icons] done');
}

main().catch((error) => {
  console.error('[pwa-icons] failed:', error);
  process.exit(1);
});
