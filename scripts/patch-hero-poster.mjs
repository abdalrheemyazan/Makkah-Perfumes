/**
 * Removes the thin dark riser directly under the Royal Leather bottle in the
 * generated hero posters, so the bottle sits directly on the large black-stone
 * pedestal.
 *
 * Approach: the original packshot is kept exactly as generated (bottle identity
 * untouched). Only the bronze/dark RISER beneath the bottle base is painted over
 * with cube-toned stone that matches the pedestal top, heavily feathered so it
 * merges seamlessly — there is NO added edge line, step, plate or rectangular
 * shadow. A soft ROUND contact shadow and a small ambient-occlusion core ground
 * the bottle onto the stone. The large pedestal is preserved.
 *
 * Originals are preserved in .asset-backups/. Re-run after regenerating posters:
 *   node scripts/patch-hero-poster.mjs
 */
import sharp from 'sharp';

function overlaySvg({ W, H, cover, shadow, ao }) {
  return `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Cube-top stone tone (matches the pedestal), for covering the riser -->
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2521"/>
      <stop offset="0.5" stop-color="#221e1a"/>
      <stop offset="1" stop-color="#1b1713"/>
    </linearGradient>
    <radialGradient id="contact" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#000000" stop-opacity="0.8"/>
      <stop offset="55%" stop-color="#000000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ao" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#000000" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="fCover" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="11"/></filter>
    <filter id="fShadow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="13"/></filter>
    <filter id="fAo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>

  <!-- Cover the riser with feathered cube-top stone (no hard edges, no highlight line) -->
  <g filter="url(#fCover)">
    <rect x="${cover.x}" y="${cover.y}" width="${cover.w}" height="${cover.h}" rx="30" fill="url(#stone)"/>
  </g>
  <!-- Soft, round contact shadow directly under the bottle base -->
  <g filter="url(#fShadow)">
    <ellipse cx="${shadow.cx}" cy="${shadow.cy}" rx="${shadow.rx}" ry="${shadow.ry}" fill="url(#contact)"/>
  </g>
  <!-- Ambient-occlusion core where the glass meets the stone -->
  <g filter="url(#fAo)">
    <ellipse cx="${ao.cx}" cy="${ao.cy}" rx="${ao.rx}" ry="${ao.ry}" fill="url(#ao)"/>
  </g>
</svg>`;
}

async function patch(src, out, spec) {
  await sharp(src)
    .composite([{ input: Buffer.from(overlaySvg(spec)), top: 0, left: 0 }])
    .webp({ quality: 90 })
    .toFile(out);
  console.log('patched', out);
}

// Desktop 2048x1143 — bottle base ~y810, riser y808-865, cube front edge ~y862.
await patch('.asset-backups/hero-poster.orig.webp', 'public/generated/posters/hero-poster.webp', {
  W: 2048,
  H: 1143,
  cover: { x: 376, y: 812, w: 496, h: 58 },
  shadow: { cx: 592, cy: 814, rx: 192, ry: 28 },
  ao: { cx: 592, cy: 810, rx: 122, ry: 13 },
});

// Mobile 1080x1350 — bottle base ~y950, riser y950-1006.
await patch('.asset-backups/hero-poster-mobile.orig.webp', 'public/generated/posters/hero-poster-mobile.webp', {
  W: 1080,
  H: 1350,
  cover: { x: 322, y: 952, w: 436, h: 60 },
  shadow: { cx: 540, cy: 954, rx: 172, ry: 26 },
  ao: { cx: 540, cy: 950, rx: 108, ry: 12 },
});
