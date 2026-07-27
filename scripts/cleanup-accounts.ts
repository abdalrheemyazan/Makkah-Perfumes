import 'dotenv/config';
import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Guarded, one-time account cleanup.
 *
 * Keeps exactly ONE account (the owner admin) and removes/anonymizes every other
 * login, WITHOUT ever deleting orders or any business history.
 *
 *   npm run accounts:cleanup                 # dry-run (default): counts only
 *   npm run accounts:cleanup -- --confirm    # apply (guarded, see below)
 *
 * Required env:
 *   DATABASE_URL
 *   ADMIN_KEEP_EMAIL                          # e.g. yazanabdalrheem@gmail.com
 * Required only for --confirm:
 *   ADMIN_KEEP_PASSWORD                       # never hardcoded/committed/printed
 *   CLEANUP_CONFIRM_PHRASE="DELETE NON ADMIN ACCOUNTS"
 *   ALLOW_PRODUCTION_ACCOUNT_CLEANUP=true     # only when NODE_ENV=production
 *
 * Strategy:
 *   - Accounts WITH orders are anonymized + disabled (login revoked) so the
 *     order→user link and all financial history survive.
 *   - Accounts WITHOUT orders are deleted along with their empty carts/wishlists.
 *   - The retained admin is upserted to SUPER_ADMIN with the supplied password;
 *     all its old sessions are revoked so a fresh login is required.
 *   - Confirmation first backs up the DB and runs the commerce audit, aborting if
 *     the audit reports a critical inconsistency. Everything runs in one
 *     transaction and rolls back on failure.
 */

const CONFIRM_PHRASE = 'DELETE NON ADMIN ACCOUNTS';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set.');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');
const isProduction = process.env.NODE_ENV === 'production';
const keepEmail = (process.env.ADMIN_KEEP_EMAIL || 'yazanabdalrheem@gmail.com').trim().toLowerCase();

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(keepEmail)) {
  console.error('✗ ADMIN_KEEP_EMAIL is not a valid email.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log('\n─── Makkah Perfumes Account Cleanup ───\n');
  console.log(`  Retained admin:  ${keepEmail}`);
  console.log(`  Mode:            ${confirm ? 'CONFIRM (WRITE)' : 'DRY-RUN (READ-ONLY)'}`);

  const allUsers = await db.user.findMany({
    select: { id: true, email: true, _count: { select: { orders: true } } },
  });

  const retainedUser = allUsers.find((u) => u.email.toLowerCase() === keepEmail);
  const otherUsers = allUsers.filter((u) => u.email.toLowerCase() !== keepEmail);
  const toPreserve = otherUsers.filter((u) => u._count.orders > 0);
  const toDelete = otherUsers.filter((u) => u._count.orders === 0);

  // Counts only — no customer emails/names are printed.
  console.log('\n─── Summary ───');
  console.log(`  Total accounts:                     ${allUsers.length}`);
  console.log(`  Retained admin:                     ${retainedUser ? '1 (existing)' : '1 (will be created)'}`);
  console.log(`  Anonymized + disabled (has orders): ${toPreserve.length}`);
  console.log(`  Deleted (no orders):                ${toDelete.length}`);
  console.log(`  Sessions revoked:                   all non-retained + the retained admin`);

  if (!confirm) {
    console.log('\n  Dry-run complete. No database changes were made.');
    console.log('  To apply: set ADMIN_KEEP_PASSWORD + CLEANUP_CONFIRM_PHRASE and re-run with --confirm.\n');
    return;
  }

  // --- Confirmation guards ---
  const keepPassword = process.env.ADMIN_KEEP_PASSWORD?.trim();
  if (!keepPassword || keepPassword.length < 8) {
    console.error('✗ ADMIN_KEEP_PASSWORD must be set (min 8 chars) for --confirm.');
    process.exit(1);
  }
  if (process.env.CLEANUP_CONFIRM_PHRASE !== CONFIRM_PHRASE) {
    console.error(`✗ Set CLEANUP_CONFIRM_PHRASE="${CONFIRM_PHRASE}" to confirm.`);
    process.exit(1);
  }
  if (isProduction && process.env.ALLOW_PRODUCTION_ACCOUNT_CLEANUP !== 'true') {
    console.error('✗ Production cleanup requires ALLOW_PRODUCTION_ACCOUNT_CLEANUP=true.');
    process.exit(1);
  }

  // Backup, then verify integrity, before any write.
  console.log('\n[cleanup] creating a backup…');
  execSync('npm run db:backup', { stdio: 'inherit' });
  console.log('[cleanup] running commerce integrity audit…');
  try {
    execSync('npm run db:audit-commerce', { stdio: 'inherit' });
  } catch {
    console.error('✗ Commerce audit reported a critical inconsistency. Aborting.');
    process.exit(1);
  }

  const passwordHash = await hash(keepPassword, 12);

  await db.$transaction(async (tx) => {
    // 1. Retained SUPER_ADMIN.
    const superAdminRole = await tx.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN', description: 'מנהל־על' },
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
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: superAdminRole.id },
    });
    await tx.session.deleteMany({ where: { userId: admin.id } });

    // 2. Anonymize + disable accounts that have order history (orders preserved).
    for (const user of toPreserve) {
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.cart.deleteMany({ where: { userId: user.id } });
      await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
      await tx.restockSubscription.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: `removed+${user.id}@anonymized.invalid`,
          firstName: null,
          lastName: null,
          phone: null,
          passwordHash: null,
          isActive: false,
          acceptsMarketing: false,
        },
      });
    }

    // 3. Delete accounts with no orders (and their dependent, non-business rows).
    for (const user of toDelete) {
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
  });

  // --- Verify ---
  const [activeLogins, superAdmins] = await Promise.all([
    db.user.count({ where: { isActive: true, passwordHash: { not: null } } }),
    db.userRole.count({ where: { role: { name: 'SUPER_ADMIN' } } }),
  ]);

  console.log('\n  ✓ Account cleanup executed successfully.');
  console.log(`  Active accounts able to log in: ${activeLogins} (expected 1)`);
  console.log(`  SUPER_ADMIN assignments:        ${superAdmins} (expected 1)`);
  console.log('  The retained admin must log in again with the new password.\n');
}

main()
  .catch((error) => {
    console.error('✗ Cleanup failed (rolled back):', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
