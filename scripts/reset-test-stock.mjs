/**
 * Restores stock for products the e2e purchase flow consumes.
 *
 * The purchase spec creates a real order each run, and a confirmed order holds
 * (reserves) stock — correct commerce behaviour, but it means repeated runs
 * slowly deplete the hero product until its buy button disables and the test
 * grabs the wrong product. Run this to reset development stock between long
 * testing sessions.
 *
 *   node scripts/reset-test-stock.mjs
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Products the e2e specs buy from, with a generous development quantity.
const TARGETS: Record<string, number> = {
  'royal-leather': 200,
  adventure: 200,
};

for (const [slug, quantity] of Object.entries(TARGETS)) {
  const variant = await db.productVariant.findFirst({
    where: { product: { slug }, isDefault: true },
    select: { id: true },
  });
  if (!variant) {
    console.warn(`skip ${slug}: no default variant`);
    continue;
  }
  await db.inventoryItem.updateMany({
    where: { variantId: variant.id },
    data: { quantityOnHand: quantity, quantityReserved: 0 },
  });
  console.log(`${slug.padEnd(16)} -> onHand=${quantity} reserved=0`);
}

await db.$disconnect();
