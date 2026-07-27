import 'dotenv/config';
import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { RoleName } from '../src/generated/prisma/enums';

/**
 * One-time LAUNCH data reset.
 *
 * Wipes all test commerce data (orders + everything downstream, carts, coupon
 * redemptions, non-retained accounts) and leaves exactly ONE SUPER_ADMIN, while
 * PRESERVING the catalog (products, images, categories, collections, prices,
 * variants) and manual inventory. Inventory is reversed from the InventoryMovement
 * ledger so no test order leaves a permanent stock effect.
 *
 *   npm run launch:reset-data                # dry-run (default): counts only
 *   npm run launch:reset-data -- --confirm   # apply (heavily guarded)
 *
 * Confirm requires:
 *   DATABASE_URL
 *   ADMIN_KEEP_EMAIL
 *   ADMIN_KEEP_PASSWORD                       # never hardcoded/printed/committed
 *   ALLOW_PRODUCTION_LAUNCH_RESET=true
 *   LAUNCH_RESET_CONFIRM_PHRASE="DELETE ALL TEST COMMERCE DATA"
 *
 * Never runs during build/deploy/migrate/seed/startup — it is a manual command.
 */

const CONFIRM_PHRASE = 'DELETE ALL TEST COMMERCE DATA';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set.');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');
const keepEmail = (process.env.ADMIN_KEEP_EMAIL || '').trim().toLowerCase();
if (!keepEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(keepEmail)) {
  console.error('✗ ADMIN_KEEP_EMAIL is not set or invalid.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Reason strings as stored (kept as plain strings to avoid enum import churn). */
type Reversal = {
  inventoryItemId: string;
  quantityOnHand: number;
  quantityReserved: number;
  restoreOnHand: number; // add back fulfilled units
  outstandingReserved: number; // reserved units still held by orders
  newOnHand: number;
  newReserved: number;
  ok: boolean; // false → ledger cannot be reversed safely
};

async function computeReversals(): Promise<Reversal[]> {
  const items = await db.inventoryItem.findMany({
    select: { id: true, quantityOnHand: true, quantityReserved: true },
  });
  const grouped = await db.inventoryMovement.groupBy({
    by: ['inventoryItemId', 'reason'],
    where: { orderId: { not: null } },
    _sum: { delta: true },
  });

  const byItem = new Map<string, Record<string, number>>();
  for (const g of grouped) {
    const m = byItem.get(g.inventoryItemId) ?? {};
    m[g.reason] = g._sum.delta ?? 0;
    byItem.set(g.inventoryItemId, m);
  }

  return items.map((item) => {
    const m = byItem.get(item.id) ?? {};
    // Stored deltas: ORDER_RESERVED = -qty, ORDER_RELEASED = +qty, ORDER_FULFILLED = -qty.
    const reservedUnits = -(m['ORDER_RESERVED'] ?? 0);
    const releasedUnits = m['ORDER_RELEASED'] ?? 0;
    const fulfilledUnits = -(m['ORDER_FULFILLED'] ?? 0);
    const outstandingReserved = reservedUnits - releasedUnits - fulfilledUnits;
    const restoreOnHand = fulfilledUnits;
    const newReserved = item.quantityReserved - outstandingReserved;
    const newOnHand = item.quantityOnHand + restoreOnHand;
    // Reserved always ends at 0 (all orders are being deleted — not a guess). The
    // only ledger-dependent value is onHand: we add back exactly the units that
    // ORDER_FULFILLED deducted. "Unsafe" means that restore would drive onHand
    // negative, which should never happen for an additive restore — if it does,
    // the ledger is corrupt and we abort rather than guess.
    const ok = newOnHand >= 0;
    return {
      inventoryItemId: item.id,
      quantityOnHand: item.quantityOnHand,
      quantityReserved: item.quantityReserved,
      restoreOnHand,
      outstandingReserved,
      newOnHand,
      newReserved,
      ok,
    };
  });
}

async function counts() {
  const [
    users,
    sessions,
    carts,
    cartItems,
    wishlists,
    addresses,
    orders,
    orderItems,
    orderEvents,
    payments,
    shipments,
    couponRedemptions,
    orderMovements,
    pushSubs,
    restockSubs,
    orderAudit,
  ] = await Promise.all([
    db.user.count(),
    db.session.count(),
    db.cart.count(),
    db.cartItem.count(),
    db.wishlist.count(),
    db.address.count(),
    db.order.count(),
    db.orderItem.count(),
    db.orderEvent.count(),
    db.payment.count(),
    db.shipment.count(),
    db.couponRedemption.count(),
    db.inventoryMovement.count({ where: { orderId: { not: null } } }),
    db.pushSubscription.count(),
    db.restockSubscription.count(),
    db.auditLog.count({ where: { entityType: 'Order' } }),
  ]);
  return {
    users, sessions, carts, cartItems, wishlists, addresses, orders, orderItems,
    orderEvents, payments, shipments, couponRedemptions, orderMovements, pushSubs,
    restockSubs, orderAudit,
  };
}

async function main() {
  console.log('\n─── Makkah Perfumes LAUNCH data reset ───\n');
  console.log(`  Retained admin: ${keepEmail}`);
  console.log(`  Mode:           ${confirm ? 'CONFIRM (WRITE)' : 'DRY-RUN (READ-ONLY)'}`);

  const c = await counts();
  console.log('\n─── Counts to be removed ───');
  console.log(`  users:                       ${c.users}  (→ 1 retained)`);
  console.log(`  sessions:                    ${c.sessions}`);
  console.log(`  carts / cart items:          ${c.carts} / ${c.cartItems}`);
  console.log(`  wishlists:                   ${c.wishlists}`);
  console.log(`  addresses:                   ${c.addresses}`);
  console.log(`  orders / order items:        ${c.orders} / ${c.orderItems}`);
  console.log(`  order events:                ${c.orderEvents}`);
  console.log(`  payments / shipments:        ${c.payments} / ${c.shipments}`);
  console.log(`  coupon redemptions:          ${c.couponRedemptions}`);
  console.log(`  order inventory movements:   ${c.orderMovements}`);
  console.log(`  push / restock subs:         ${c.pushSubs} / ${c.restockSubs}`);
  console.log(`  order-related audit records: ${c.orderAudit}`);

  const reversals = await computeReversals();
  const affected = reversals.filter((r) => r.restoreOnHand > 0 || r.outstandingReserved !== 0);
  const unsafe = reversals.filter((r) => !r.ok); // onHand would go negative — blocking
  const drift = reversals.filter((r) => r.newReserved !== 0); // reserved counter ≠ ledger — informational
  const totalRestore = reversals.reduce((s, r) => s + r.restoreOnHand, 0);

  console.log('\n─── Inventory reversal plan ───');
  console.log(`  items affected by orders:    ${affected.length}`);
  console.log(`  onHand units to restore:     ${totalRestore}  (from ORDER_FULFILLED)`);
  console.log(`  reserved → 0 for all items`);
  if (drift.length > 0) {
    console.log(`\n  ℹ ${drift.length} item(s) whose reserved counter drifted from the ledger`);
    console.log('    (harmless here — reserved is zeroed because every order is deleted):');
    for (const r of drift.slice(0, 10)) {
      console.log(`    item ${r.inventoryItemId}: reserved ${r.quantityReserved}, ledger-outstanding ${r.outstandingReserved} → set to 0`);
    }
  }
  if (unsafe.length > 0) {
    console.log(`\n  ✗ ${unsafe.length} item(s) would go negative on onHand restore — the ledger is corrupt. Aborting.`);
    for (const r of unsafe.slice(0, 10)) {
      console.log(`    item ${r.inventoryItemId}: onHand ${r.quantityOnHand} + restore ${r.restoreOnHand} = ${r.newOnHand}`);
    }
  }

  if (!confirm) {
    console.log('\n  Dry-run complete. No data changed.');
    console.log('  To apply: set ADMIN_KEEP_PASSWORD, ALLOW_PRODUCTION_LAUNCH_RESET=true,');
    console.log(`  LAUNCH_RESET_CONFIRM_PHRASE="${CONFIRM_PHRASE}", then run with --confirm.\n`);
    return;
  }

  // --- Confirmation guards ---
  const password = process.env.ADMIN_KEEP_PASSWORD;
  if (!password || password.length < 8) {
    console.error('✗ ADMIN_KEEP_PASSWORD must be set (min 8 chars) for --confirm.');
    process.exit(1);
  }
  if (process.env.ALLOW_PRODUCTION_LAUNCH_RESET !== 'true') {
    console.error('✗ Set ALLOW_PRODUCTION_LAUNCH_RESET=true to confirm.');
    process.exit(1);
  }
  if (process.env.LAUNCH_RESET_CONFIRM_PHRASE !== CONFIRM_PHRASE) {
    console.error(`✗ Set LAUNCH_RESET_CONFIRM_PHRASE="${CONFIRM_PHRASE}" to confirm.`);
    process.exit(1);
  }
  if (unsafe.length > 0) {
    console.error('✗ Inventory ledger cannot be reversed safely. Aborting — no guessing.');
    process.exit(1);
  }

  // Backup, then integrity audit, before any write.
  console.log('\n[reset] creating a backup…');
  execSync('npm run db:backup', { stdio: 'inherit' });
  console.log('[reset] running commerce integrity audit…');
  try {
    execSync('npm run db:audit-commerce', { stdio: 'inherit' });
  } catch {
    console.error('✗ Commerce audit reported a critical inconsistency. Aborting.');
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);

  await db.$transaction(async (tx) => {
    // 1. Reverse inventory from the ledger (before deleting movements).
    for (const r of reversals) {
      if (r.restoreOnHand !== 0 || r.quantityReserved !== 0) {
        await tx.inventoryItem.update({
          where: { id: r.inventoryItemId },
          data: { quantityOnHand: r.newOnHand, quantityReserved: 0 },
        });
      }
    }
    // 2. Delete order-linked inventory movements (keep manual adjustments/restocks).
    await tx.inventoryMovement.deleteMany({ where: { orderId: { not: null } } });

    // 3. Delete orders — cascades items, events, payments, shipments, redemptions.
    await tx.order.deleteMany({});

    // 4. Coupons: keep definitions, reset usage counters to reflect zero redemptions.
    await tx.coupon.updateMany({ data: { usageCount: 0 } });

    // 5. Order-related audit records.
    await tx.auditLog.deleteMany({ where: { entityType: 'Order' } });

    // 6. Carts, wishlists, addresses, subscriptions, sessions, reset tokens.
    await tx.cartItem.deleteMany({});
    await tx.cart.deleteMany({});
    await tx.wishlistItem.deleteMany({});
    await tx.wishlist.deleteMany({});
    await tx.address.deleteMany({});
    await tx.pushSubscription.deleteMany({});
    await tx.restockSubscription.deleteMany({});
    await tx.session.deleteMany({});
    await tx.passwordResetToken.deleteMany({});

    // 7. Delete every account except the retained one (roles cascade with the user).
    await tx.user.deleteMany({ where: { NOT: { email: keepEmail } } });

    // 8. Retained SUPER_ADMIN — upsert, reset password, activate, single role.
    const superAdmin = await tx.role.upsert({
      where: { name: RoleName.SUPER_ADMIN },
      update: {},
      create: { name: RoleName.SUPER_ADMIN, description: 'מנהל־על' },
      select: { id: true },
    });
    const admin = await tx.user.upsert({
      where: { email: keepEmail },
      update: { passwordHash, isActive: true, emailVerified: new Date() },
      create: {
        email: keepEmail,
        passwordHash,
        firstName: 'מנהל',
        lastName: 'ראשי',
        isActive: true,
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    // Exactly one SUPER_ADMIN role, no obsolete roles.
    await tx.userRole.deleteMany({ where: { userId: admin.id, NOT: { roleId: superAdmin.id } } });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdmin.id } },
      update: {},
      create: { userId: admin.id, roleId: superAdmin.id },
    });
  });

  // --- Verify ---
  const [
    userCount, activeCount, superAdminCount, orderCount, redemptionCount, cartItemCount, reservedItems, negativeOnHand, productCount,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true, passwordHash: { not: null } } }),
    db.userRole.count({ where: { role: { name: RoleName.SUPER_ADMIN } } }),
    db.order.count(),
    db.couponRedemption.count(),
    db.cartItem.count(),
    db.inventoryItem.count({ where: { quantityReserved: { not: 0 } } }),
    db.inventoryItem.count({ where: { quantityOnHand: { lt: 0 } } }),
    db.product.count(),
  ]);

  console.log('\n  ✓ Launch reset complete.');
  console.log(`  users: ${userCount} (1) · active logins: ${activeCount} (1) · SUPER_ADMIN: ${superAdminCount} (1)`);
  console.log(`  orders: ${orderCount} (0) · coupon redemptions: ${redemptionCount} (0) · cart items: ${cartItemCount} (0)`);
  console.log(`  items with reserved≠0: ${reservedItems} (0) · negative onHand: ${negativeOnHand} (0)`);
  console.log(`  products preserved: ${productCount}`);
  console.log('  The retained admin must log in again with the new password.\n');
}

main()
  .catch((error) => {
    console.error('✗ Launch reset failed (rolled back):', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
