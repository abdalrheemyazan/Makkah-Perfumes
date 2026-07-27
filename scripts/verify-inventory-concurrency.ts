import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { reserveStock } from '../src/lib/commerce/inventory';

/**
 * Proves the oversell guarantee against a REAL database.
 *
 * Creates a disposable product with exactly ONE sellable unit, fires many
 * concurrent reservations at it, and asserts that exactly one wins, none oversell,
 * and stock never goes negative. Cleans up its own data afterwards. Safe on the
 * local dev database; do not point it at production.
 *
 *   npm run db:server            # (in another terminal)
 *   tsx scripts/verify-inventory-concurrency.ts
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set. Start the DB with `npm run db:server`.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const RACERS = 8;
const STAMP = Date.now();

async function main() {
  console.log(`\n─── בדיקת מקביליות מלאי (${RACERS} רוכשים על יחידה אחת) ───\n`);

  const product = await db.product.create({
    data: {
      slug: `zz-concurrency-test-${STAMP}`,
      nameHe: 'בדיקת מקביליות (זמני)',
      nameEn: 'Concurrency Test (temp)',
      status: 'DRAFT',
      variants: {
        create: {
          sku: `ZZ-CONC-${STAMP}`,
          priceAgorot: 1000,
          inventoryItem: { create: { quantityOnHand: 1, quantityReserved: 0 } },
        },
      },
    },
    include: { variants: { include: { inventoryItem: true } } },
  });

  const inventoryItemId = product.variants[0].inventoryItem!.id;

  try {
    // Fire N reservations for the last unit at the same time.
    const results = await Promise.all(
      Array.from({ length: RACERS }, () =>
        db
          .$transaction((tx) => reserveStock(tx, inventoryItemId, 1))
          .catch(() => false),
      ),
    );

    const wins = results.filter(Boolean).length;
    const finalItem = await db.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    const onHand = finalItem!.quantityOnHand;
    const reserved = finalItem!.quantityReserved;
    const available = onHand - reserved;

    console.log(`  רוכשים בו-זמנית:        ${RACERS}`);
    console.log(`  הצליחו לשריין:          ${wins}`);
    console.log(`  quantityOnHand סופי:    ${onHand}`);
    console.log(`  quantityReserved סופי:  ${reserved}`);
    console.log(`  זמין סופי:              ${available}`);

    const ok =
      wins === 1 && reserved === 1 && onHand === 1 && available === 0;

    console.log('');
    if (ok) {
      console.log('  ✓ בדיוק רכישה אחת הצליחה, ללא מכירת יתר, המלאי לא ירד מתחת לאפס.\n');
    } else {
      console.log('  ✗ כשל: התקבלה תוצאה שגויה (מכירת יתר או ניכוי כפול).\n');
      process.exitCode = 1;
    }
  } finally {
    // Remove the disposable product and everything under it.
    await db.product.delete({ where: { id: product.id } }).catch(() => {});
    console.log('  (נתוני הבדיקה נמחקו)\n');
  }
}

main()
  .catch((error) => {
    console.error('✗ Verification failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
