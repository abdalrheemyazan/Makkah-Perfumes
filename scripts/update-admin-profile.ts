import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { RoleName } from '../src/generated/prisma/enums';

/**
 * Sets the retained admin's display NAME (not a role word) — e.g. "יזן" — so the
 * header greets "שלום, יזן" instead of "שלום, מנהל". It touches ONLY the name and
 * ensures the account is active/verified with SUPER_ADMIN. It never changes the
 * password, never revokes sessions, and prints no secrets.
 *
 *   npm run admin:update-profile                # dry-run (default)
 *   npm run admin:update-profile -- --confirm   # write
 *
 * Env: DATABASE_URL, ADMIN_KEEP_EMAIL, ADMIN_KEEP_NAME (default "יזן").
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set.');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');
const email = (process.env.ADMIN_KEEP_EMAIL || '').trim().toLowerCase();
const name = (process.env.ADMIN_KEEP_NAME || 'יזן').trim();

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('✗ ADMIN_KEEP_EMAIL is not set or invalid.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log('\n─── Admin profile update ───\n');
  console.log(`  email: ${email}`);
  console.log(`  target name: ${name}`);

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });

  if (!user) {
    console.error(`\n✗ No account with ${email}. Run the account setup first.`);
    process.exit(1);
  }

  const isSuperAdmin = user.roles.some((r) => r.role.name === 'SUPER_ADMIN');
  console.log(`  current name: ${user.firstName ?? '—'} ${user.lastName ?? ''}`.trim());
  console.log(`  active: ${user.isActive} · SUPER_ADMIN: ${isSuperAdmin ? 'yes' : 'no'}`);

  if (!confirm) {
    console.log('\n  Dry-run only. Re-run with --confirm to write.\n');
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { firstName: name, lastName: null, isActive: true, emailVerified: new Date() },
    });
    // Ensure exactly SUPER_ADMIN (does not remove the role if already present).
    const role = await tx.role.upsert({
      where: { name: RoleName.SUPER_ADMIN },
      update: {},
      create: { name: RoleName.SUPER_ADMIN, description: 'מנהל־על' },
      select: { id: true },
    });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  });

  console.log(`\n  ✓ Name updated to "${name}". Password and sessions unchanged.\n`);
}

main()
  .catch((error) => {
    console.error('✗ Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
