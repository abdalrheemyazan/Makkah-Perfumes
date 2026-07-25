import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Removes automated-test products from a DEVELOPMENT database, leaving the 13
 * official Makkah Perfumes products untouched.
 *
 *   npm run db:cleanup-test-products               # dry run (default, no changes)
 *   npm run db:cleanup-test-products -- --confirm  # actually delete
 *
 * Safety:
 *   - Dry run is the default; nothing is deleted without --confirm.
 *   - Refuses to run when NODE_ENV=production or DATABASE_URL is missing.
 *   - Validates that all 13 official products exist before touching anything.
 *   - Deletes ONLY products that positively match a strong test pattern AND are
 *     not on the official slug whitelist.
 *   - A test product referenced by a real order is ARCHIVED (unpublished), not
 *     deleted, so order history is never touched. (OrderItem already keeps a
 *     full name/price snapshot and its variant FK is SetNull, so deletion would
 *     also be safe — archiving is the conservative belt-and-braces choice.)
 */

// The 13 official products, identified by their stable slug (SKUs are generated
// placeholders; slugs are the durable identity).
const OFFICIAL_SLUGS = [
  'royal-leather',
  'blossom-candy',
  'oud-embrace',
  'luban',
  'amber-incense',
  'pure-essence',
  'luxe-rose',
  'amour-touch',
  'adventure',
  'storm-blue',
  'courage',
  'atheel',
  'precious-vanilla',
];

const confirm = process.argv.includes('--confirm');

function die(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  die('Refusing to run: NODE_ENV=production. This script is for development only.');
}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) die('DATABASE_URL is not set. Start the DB with `npm run db:server`.');

// Show host/port/db without ever printing credentials.
try {
  const u = new URL(connectionString);
  console.log(
    `Database: ${u.hostname}:${u.port || '5432'}/${decodeURIComponent(u.pathname.slice(1)).split('?')[0]}`,
  );
} catch {
  console.log('Database: (unparsable DATABASE_URL — host hidden)');
}
console.log(`Mode: ${confirm ? 'CONFIRM (will delete/archive)' : 'DRY RUN (no changes)'}\n`);

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Strong, test-only signals. A product must match at least one to be a candidate. */
function testPatterns(product, skus) {
  const hits = [];
  if (skus.some((s) => /^TEST-/.test(s))) hits.push('SKU^TEST-');
  if (skus.some((s) => /^E2E-/.test(s))) hits.push('SKU^E2E-');
  if (/^Test Fragrance/.test(product.nameEn)) hits.push('nameEn^Test Fragrance');
  if (/^בושם בדיקה/.test(product.nameHe)) hits.push('nameHe^בושם בדיקה');
  return hits;
}

async function main() {
  const products = await db.product.findMany({
    include: {
      variants: { select: { id: true, sku: true } },
      images: { select: { id: true } },
    },
  });

  // Validate the official whitelist BEFORE any deletion.
  const presentSlugs = new Set(products.map((p) => p.slug));
  const missingOfficial = OFFICIAL_SLUGS.filter((s) => !presentSlugs.has(s));
  if (missingOfficial.length > 0) {
    die(
      `Official whitelist could not be validated — missing official products: ${missingOfficial.join(', ')}. Aborting.`,
    );
  }
  console.log(`✓ All 13 official products present.\n`);

  const officialSet = new Set(OFFICIAL_SLUGS);

  // Build candidate list: strong test pattern AND not official.
  const candidates = [];
  for (const p of products) {
    if (officialSet.has(p.slug)) continue;
    const skus = p.variants.map((v) => v.sku);
    const hits = testPatterns(p, skus);
    if (hits.length === 0) continue; // never delete an unknown non-test product
    candidates.push({ product: p, skus, hits });
  }

  if (candidates.length === 0) {
    console.log('No test products found. Nothing to do.');
    return;
  }

  // Gather dependent counts + order references per candidate.
  const rows = [];
  for (const c of candidates) {
    const p = c.product;
    const variantIds = p.variants.map((v) => v.id);
    const [orderRefs, cartItems, wishlistItems, reviews, collections, notes] = await Promise.all([
      variantIds.length ? db.orderItem.count({ where: { variantId: { in: variantIds } } }) : 0,
      variantIds.length ? db.cartItem.count({ where: { variantId: { in: variantIds } } }) : 0,
      db.wishlistItem.count({ where: { productId: p.id } }),
      db.review.count({ where: { productId: p.id } }),
      db.productCollection.count({ where: { productId: p.id } }),
      db.productFragranceNote.count({ where: { productId: p.id } }),
    ]);
    rows.push({
      nameHe: p.nameHe,
      nameEn: p.nameEn,
      sku: c.skus[0] ?? '(no variant)',
      slug: p.slug,
      created: p.createdAt.toISOString().slice(0, 10),
      status: p.status,
      hits: c.hits.join(', '),
      dependents: p.variants.length + p.images.length + cartItems + wishlistItems + reviews + collections + notes,
      orderRefs,
      action: orderRefs > 0 ? 'ARCHIVE' : 'DELETE',
      id: p.id,
    });
  }

  // Print the dry-run / plan table.
  console.log(`Found ${rows.length} test product(s):\n`);
  console.log(
    ['name (he/en)', 'sku', 'slug', 'created', 'status', 'match', 'deps', 'orders', 'action'].join(' | '),
  );
  console.log('-'.repeat(120));
  for (const r of rows) {
    console.log(
      [
        `${r.nameHe} / ${r.nameEn}`,
        r.sku,
        r.slug,
        r.created,
        r.status,
        r.hits,
        r.dependents,
        r.orderRefs,
        r.action,
      ].join(' | '),
    );
  }

  const toDelete = rows.filter((r) => r.action === 'DELETE');
  const toArchive = rows.filter((r) => r.action === 'ARCHIVE');
  console.log(`\nPlan: delete ${toDelete.length}, archive ${toArchive.length}.`);

  if (!confirm) {
    console.log('\nDry run — no changes made. Re-run with `-- --confirm` to apply.');
    return;
  }

  // Apply in a single transaction. Product delete cascades to variants, images,
  // inventory, cart/wishlist items, reviews, collections, notes, media, models,
  // relations; OrderItem.variantId is SetNull, preserving order snapshots.
  await db.$transaction(async (tx) => {
    if (toArchive.length) {
      await tx.product.updateMany({
        where: { id: { in: toArchive.map((r) => r.id) } },
        data: { status: 'ARCHIVED' },
      });
    }
    if (toDelete.length) {
      await tx.product.deleteMany({ where: { id: { in: toDelete.map((r) => r.id) } } });
    }
  });

  console.log(`\n✓ Deleted ${toDelete.length}, archived ${toArchive.length}.`);

  const remaining = await db.product.count();
  const remainingTest = await db.product.count({
    where: {
      OR: [
        { nameEn: { startsWith: 'Test Fragrance' } },
        { nameHe: { startsWith: 'בושם בדיקה' } },
        { variants: { some: { OR: [{ sku: { startsWith: 'TEST-' } }, { sku: { startsWith: 'E2E-' } }] } } },
      ],
    },
  });
  console.log(`Products remaining: ${remaining} (test-pattern remaining: ${remainingTest}).`);
}

main()
  .catch((error) => {
    console.error('✗ Cleanup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
