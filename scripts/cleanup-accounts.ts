import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Account cleanup script.
 *
 * Preserves historical orders and business records while safely cleaning up non-admin accounts.
 *
 *   npm run accounts:cleanup                # dry-run (default)
 *   npm run accounts:cleanup -- --confirm   # write
 *
 * Required env vars:
 *   DATABASE_URL
 *   ADMIN_KEEP_EMAIL (defaults to yazanabdalrheem@gmail.com)
 *   ADMIN_KEEP_PASSWORD
 *   ALLOW_PRODUCTION_ACCOUNT_CLEANUP=true (for write mode)
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set.');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');
const keepEmailRaw = process.env.ADMIN_KEEP_EMAIL || 'yazanabdalrheem@gmail.com';
const keepEmail = keepEmailRaw.trim().toLowerCase();
const keepPassword = process.env.ADMIN_KEEP_PASSWORD?.trim();
const allowProduction = process.env.ALLOW_PRODUCTION_ACCOUNT_CLEANUP === 'true';

if (!keepPassword) {
  console.error('✗ ADMIN_KEEP_PASSWORD runtime environment variable is required.');
  process.exit(1);
}

if (confirm && !allowProduction) {
  console.error('✗ Production account cleanup requires ALLOW_PRODUCTION_ACCOUNT_CLEANUP=true.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log('\n─── Makkah Perfumes Account Cleanup ───\n');
  console.log(`  Retained Admin Email: ${keepEmail}`);
  console.log(`  Mode:                ${confirm ? 'CONFIRM (WRITE)' : 'DRY-RUN (READ-ONLY)'}`);

  const allUsers = await db.user.findMany({
    select: {
      id: true,
      email: true,
      _count: {
        select: {
          orders: true,
          sessions: true,
          carts: true,
          contactMessages: true,
          auditLogs: true,
          reviews: true,
        },
      },
    },
  });

  const retainedUser = allUsers.find((u) => u.email.toLowerCase() === keepEmail);
  const otherUsers = allUsers.filter((u) => u.email.toLowerCase() !== keepEmail);

  let toPreserveCount = 0; // Has order history -> deactivate & revoke sessions
  let toDeleteCount = 0;   // No order history -> delete

  for (const user of otherUsers) {
    if (user._count.orders > 0) {
      toPreserveCount++;
    } else {
      toDeleteCount++;
    }
  }

  console.log('\n─── Account Audit Summary ───');
  console.log(`  Total accounts found:               ${allUsers.length}`);
  console.log(`  Retained admin account:             ${retainedUser ? '1 (existing)' : '1 (will be created)'}`);
  console.log(`  Accounts to delete (no orders):     ${toDeleteCount}`);
  console.log(`  Accounts to preserve (has orders):  ${toPreserveCount}`);

  if (!confirm) {
    console.log('\n  Dry-run complete. No database changes were made.');
    console.log('  To execute cleanup, set ALLOW_PRODUCTION_ACCOUNT_CLEANUP=true and re-run with --confirm.\n');
    return;
  }

  // Write mode inside transaction
  await db.$transaction(async (tx) => {
    // 1. Ensure SUPER_ADMIN role exists
    let superAdminRole = await tx.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!superAdminRole) {
      superAdminRole = await tx.role.create({
        data: {
          name: 'SUPER_ADMIN',
          description: 'מנהל מערכת ראשי בעל הרשאות מלאות',
        },
      });
    }

    if (!keepPassword) {
      throw new Error('ADMIN_KEEP_PASSWORD environment variable is required');
    }

    // Hash the password securely
    const passwordHash = await hash(keepPassword, 12);

    // 2. Upsert retained admin account
    let adminUser = await tx.user.findUnique({ where: { email: keepEmail } });
    if (adminUser) {
      adminUser = await tx.user.update({
        where: { id: adminUser.id },
        data: {
          emailVerified: new Date(),
          passwordHash,
          isActive: true,
        },
      });
    } else {
      adminUser = await tx.user.create({
        data: {
          email: keepEmail,
          emailVerified: new Date(),
          passwordHash,
          isActive: true,
          firstName: 'מנהל',
          lastName: 'ראשי',
        },
      });
    }

    // Ensure SUPER_ADMIN role assignment
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
      create: { userId: adminUser.id, roleId: superAdminRole.id },
      update: {},
    });

    // Revoke all existing sessions for admin so fresh login is required
    await tx.session.deleteMany({ where: { userId: adminUser.id } });

    // 3. Process non-admin accounts
    for (const user of otherUsers) {
      if (user._count.orders > 0) {
        // Has historical orders: preserve order record, deactivate account & revoke access
        await tx.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            passwordHash: null,
          },
        });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.cart.deleteMany({ where: { userId: user.id } });
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      } else {
        // No orders: delete sessions, carts, tokens, wishlists, roles, addresses, and user
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.cart.deleteMany({ where: { userId: user.id } });
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await tx.wishlist.deleteMany({ where: { userId: user.id } });
        await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
        await tx.restockSubscription.deleteMany({ where: { userId: user.id } });
        await tx.userRole.deleteMany({ where: { userId: user.id } });
        await tx.address.deleteMany({ where: { userId: user.id } });
        await tx.user.delete({ where: { id: user.id } });
      }
    }
  });

  console.log('\n  ✓ Account cleanup executed successfully.');
  console.log(`  ✓ Retained admin account "${keepEmail}" updated with SUPER_ADMIN privileges.`);
  console.log('  ✓ All previous sessions revoked; fresh login required.\n');
}

main()
  .catch((error) => {
    console.error('✗ Cleanup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
