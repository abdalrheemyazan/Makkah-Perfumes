/**
 * Generates the PWA icon set from the official ivory logo.
 *
 * The logo geometry is never distorted — it is scaled with `fit: contain` and
 * centred on the brand ink background, with generous padding so maskable icons
 * survive the platform's circular/rounded safe-zone crop (Android masks to ~80%
 * of the canvas, so logo content stays well inside that).
 *
 * Source:  public/brand-reference/logo/logo-ivory.png  (ivory logo, transparent)
 * Output:  public/icons/*.png  +  public/apple-touch-icon.png
 *
 *   node scripts/build-pwa-icons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = join(root, 'public', 'brand-reference', 'logo', 'logo-ivory.png');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// Brand ink, matching the manifest theme/background and the app background.
const INK = { r: 11, g: 10, b: 8, alpha: 1 };

/**
 * Renders one square icon.
 * @param size    canvas size in px
 * @param file    output path
 * @param inset   fraction of the canvas reserved as padding on each side
 * @param flatten drop alpha (required for iOS apple-touch-icon)
 */
async function renderIcon(size, file, inset, flatten) {
  const contentBox = Math.round(size * (1 - inset * 2));
  const logo = await sharp(logoPath)
    .resize(contentBox, contentBox, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  let canvas = sharp({
    create: { width: size, height: size, channels: 4, background: flatten ? INK : { ...INK, alpha: 1 } },
  }).composite([{ input: logo, gravity: 'center' }]);

  if (flatten) canvas = canvas.flatten({ background: INK });

  await canvas.png().toFile(file);
  console.log(`  ✓ ${file.replace(root + '\\', '').replace(root + '/', '')}  (${size}×${size})`);
}

async function main() {
  console.log('[pwa-icons] generating from logo-ivory.png');

  // Standard icons: ~14% padding each side.
  await renderIcon(192, join(outDir, 'icon-192.png'), 0.14, false);
  await renderIcon(512, join(outDir, 'icon-512.png'), 0.14, false);

  // Maskable icons: ~22% padding so content stays inside the safe zone.
  await renderIcon(192, join(outDir, 'maskable-192.png'), 0.22, false);
  await renderIcon(512, join(outDir, 'maskable-512.png'), 0.22, false);

  // Apple touch icon: 180×180, opaque (iOS ignores transparency and adds its own
  // rounding), ~16% padding.
  await renderIcon(180, join(root, 'public', 'apple-touch-icon.png'), 0.16, true);

  // Small monochrome-ish favicon for browser tabs.
  await renderIcon(32, join(outDir, 'favicon-32.png'), 0.1, true);

  console.log('[pwa-icons] done');
}

main().catch((error) => {
  console.error('[pwa-icons] failed:', error);
  process.exit(1);
});
