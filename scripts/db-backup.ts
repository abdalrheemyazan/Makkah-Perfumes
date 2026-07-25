import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Logical backup — a portable JSON snapshot of the core store tables.
 *
 * Works against ANY PostgreSQL the DATABASE_URL points at (the embedded local
 * database or a managed one) without needing pg_dump on PATH. It is read-only;
 * it never modifies data. Output goes to backups/backup-<timestamp>.json, which
 * is git-ignored.
 *
 *   npm run db:backup
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set. Start the DB with `npm run db:server`.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [products, variants, inventory, users, addresses, orders, orderItems, coupons, contactMessages] =
    await Promise.all([
      db.product.findMany(),
      db.productVariant.findMany(),
      db.inventoryItem.findMany(),
      // Never export password hashes or session tokens.
      db.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      }),
      db.address.findMany(),
      db.order.findMany(),
      db.orderItem.findMany(),
      db.coupon.findMany(),
      db.contactMessage.findMany(),
    ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    counts: {
      products: products.length,
      variants: variants.length,
      inventory: inventory.length,
      users: users.length,
      addresses: addresses.length,
      orders: orders.length,
      orderItems: orderItems.length,
      coupons: coupons.length,
      contactMessages: contactMessages.length,
    },
    data: { products, variants, inventory, users, addresses, orders, orderItems, coupons, contactMessages },
  };

  const dir = join(process.cwd(), 'backups');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf8');

  console.log(`✓ Backup written to ${file}`);
  console.log(`  ${snapshot.counts.products} products · ${snapshot.counts.orders} orders · ${snapshot.counts.users} users`);
}

main()
  .catch((error) => {
    console.error('✗ Backup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
