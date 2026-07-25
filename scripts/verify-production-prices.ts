import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

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

const OFFICIAL_SKUS = OFFICIAL_SLUGS.map((slug) => `MKP-${slug.toUpperCase()}-STD`);

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

// 1. Refuse to run when DATABASE_URL is missing
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  fail('DATABASE_URL is not set.');
}

// 2. Parse arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isConfirm = args.includes('--confirm');

if ((isDryRun && isConfirm) || (!isDryRun && !isConfirm)) {
  fail('You must specify exactly one of --dry-run or --confirm.');
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log('→ Fetching products matching the whitelist...');

  const products = await db.product.findMany({
    where: {
      OR: [
        { slug: { in: OFFICIAL_SLUGS } },
        {
          variants: {
            some: {
              sku: { in: OFFICIAL_SKUS },
            },
          },
        },
      ],
    },
    include: {
      variants: {
        select: {
          sku: true,
        },
      },
    },
  });

  console.log(`Found ${products.length} products matching the whitelist.\n`);

  if (products.length === 0) {
    fail('No whitelisted products found in the database.');
  }

  // Print summary of what would change
  console.log('Products to update:');
  for (const product of products) {
    const skuList = product.variants.map((v) => v.sku).join(', ');
    console.log(
      `  - Slug: ${product.slug} (SKUs: ${skuList})` +
      `\n    Current: pricingVerified = ${product.pricingVerified}, isDevelopmentData = ${product.isDevelopmentData}` +
      `\n    Target:  pricingVerified = true, isDevelopmentData = false`
    );
  }

  // Fetch current site setting
  const setting = await db.siteSetting.findUnique({
    where: { key: 'data.pricingVerified' },
  });
  console.log(
    `\nSite Setting "data.pricingVerified":` +
    `\n  Current: "${setting?.value ?? 'undefined'}"` +
    `\n  Target:  "true"\n`
  );

  if (isDryRun) {
    console.log('★ DRY RUN COMPLETE. No changes have been made to the database.');
    return;
  }

  // Confirm mode: perform updates in a transaction
  console.log('→ Executing database updates...');
  await db.$transaction(async (tx) => {
    const targetProductIds = products.map((p) => p.id);

    const updateCount = await tx.product.updateMany({
      where: {
        id: { in: targetProductIds },
      },
      data: {
        pricingVerified: true,
        isDevelopmentData: false,
      },
    });

    await tx.siteSetting.upsert({
      where: { key: 'data.pricingVerified' },
      update: { value: 'true' },
      create: { key: 'data.pricingVerified', value: 'true' },
    });

    console.log(`✓ Successfully updated ${updateCount.count} products.`);
    console.log('✓ Successfully updated site setting data.pricingVerified to "true".');
  });
}

main()
  .catch((err) => {
    console.error('✗ Script failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
