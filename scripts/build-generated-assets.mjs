/**
 * Turns the accepted Higgsfield raw renders into the web assets the site ships.
 *
 * Inputs  : .cache/higgsfield/*.png   (raw 2752x1536 renders, git-ignored)
 * Outputs : public/generated/**       (optimised, committed)
 *
 * The hero poster is a COMPOSITE: the generated stage plate provides the
 * lighting, stone and smoke, and the real client packshot is layered on top
 * unmodified. That is deliberate — an earlier attempt to have the model render
 * the bottle produced a label reading "MAKKAN / SINCE 1973" instead of
 * "MAKKAH / SINCE 1976". Compositing keeps product identity pixel-exact.
 *
 *   node scripts/build-generated-assets.mjs
 */
import { mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = join(root, '.cache', 'higgsfield');
const out = join(root, 'public', 'generated');
const packshots = join(root, 'public', 'brand-reference', 'products');

for (const sub of ['cinematic', 'mobile', 'posters', 'social', 'products', 'textures']) {
  await mkdir(join(out, sub), { recursive: true });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const WEBP = { quality: 82, effort: 5 };
const results = [];

function record(file, info) {
  results.push({ file, ...info });
}

/** Landscape hero/scene plate, capped at 2048px wide. */
async function scene(name, sourceFile) {
  const source = join(raw, sourceFile);
  if (!(await exists(source))) {
    console.warn(`skip ${name}: missing ${sourceFile}`);
    return;
  }

  const desktop = join(out, 'cinematic', `${name}.webp`);
  const info = await sharp(source).resize({ width: 2048 }).webp(WEBP).toFile(desktop);
  record(`generated/cinematic/${name}.webp`, info);

  // Portrait crop for mobile: take the left 56% of the frame, where the
  // subject sits, so the composition survives the aspect change.
  const meta = await sharp(source).metadata();
  const cropW = Math.round(meta.width * 0.56);
  const mobile = join(out, 'mobile', `${name}-mobile.webp`);
  const mInfo = await sharp(source)
    .extract({ left: 0, top: 0, width: cropW, height: meta.height })
    .resize({ width: 1080, height: 1350, fit: 'cover', position: 'centre' })
    .webp(WEBP)
    .toFile(mobile);
  record(`generated/mobile/${name}-mobile.webp`, mInfo);
}

await scene('hero-stage', 'stage-plate.png');
await scene('scene-frankincense', 'frankincense.png');
await scene('scene-craft', 'craft.png');
await scene('scene-incense', 'incense.png');

/**
 * Hero poster — generated stage + real packshot, composited.
 * Used as the LCP image, the reduced-motion still, and the OG source.
 */
const stage = join(raw, 'stage-plate.png');
if (await exists(stage)) {
  const bottle = join(packshots, 'royal-leather.png');

  // Geometry measured against the 2752x1536 plate: the lit pool on the
  // pedestal top is centred near x=800, and its surface sits at y=1130.
  const BOTTLE_W = 495;
  const BOTTLE_H = 660;
  const LEFT = 543;
  const TOP = 470;

  const bottleBuf = await sharp(bottle)
    .resize({ width: BOTTLE_W, height: BOTTLE_H, fit: 'inside' })
    .png()
    .toBuffer();

  // Soft contact shadow so the bottle sits in the scene instead of floating.
  const shadow = await sharp({
    create: {
      width: Math.round(BOTTLE_W * 0.95),
      height: 46,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.6 },
    },
  })
    .blur(22)
    .png()
    .toBuffer();

  // Composite once at full plate resolution, then derive every crop from the
  // resulting buffer. sharp applies extract/resize/composite in a fixed order
  // within one pipeline, so chaining a crop after a composite does not work.
  const composited = await sharp(stage)
    .composite([
      { input: shadow, left: LEFT + 12, top: TOP + BOTTLE_H - 26 },
      { input: bottleBuf, left: LEFT, top: TOP },
    ])
    .png()
    .toBuffer();

  const poster = join(out, 'posters', 'hero-poster.webp');
  const pInfo = await sharp(composited).resize({ width: 2048 }).webp(WEBP).toFile(poster);
  record('generated/posters/hero-poster.webp', pInfo);

  // Mobile poster: portrait crop centred on the bottle.
  const mobilePoster = join(out, 'posters', 'hero-poster-mobile.webp');
  const mpInfo = await sharp(composited)
    .extract({ left: 190, top: 0, width: 1240, height: 1536 })
    .resize({ width: 1080, height: 1350, fit: 'cover' })
    .webp(WEBP)
    .toFile(mobilePoster);
  record('generated/posters/hero-poster-mobile.webp', mpInfo);

  // Open Graph card — 1200x630, JPEG for maximum crawler compatibility.
  const og = join(out, 'social', 'og-home.jpg');
  const ogInfo = await sharp(composited)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(og);
  record('generated/social/og-home.jpg', ogInfo);
}

const totalKb = Math.round(results.reduce((sum, r) => sum + r.size, 0) / 1024);
for (const r of results) {
  console.log(
    `${String(Math.round(r.size / 1024)).padStart(5)} KB  ${String(r.width).padStart(4)}x${String(r.height).padEnd(4)}  ${r.file}`,
  );
}
console.log(`\n${results.length} assets, ${totalKb} KB total`);
