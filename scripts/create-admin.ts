import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { RoleName } from '../src/generated/prisma/enums';

/**
 * Secure, idempotent SUPER_ADMIN provisioning.
 *
 * Reads credentials ONLY from the environment — never hard-coded, never printed:
 *
 *   ADMIN_SEED_EMAIL       required — the admin's email
 *   ADMIN_SEED_PASSWORD    required — the initial password (min 8 chars)
 *   ADMIN_SEED_FIRST_NAME  optional — display name for new accounts (default "מנהל")
 *
 * Run it once, locally, passing the values inline so they never touch a file or
 * git history:
 *
 *   ADMIN_SEED_EMAIL="you@example.com" ADMIN_SEED_PASSWORD="…" npm run admin:create
 *
 * Behaviour:
 *   - If the user does not exist, it is created (active, email pre-verified).
 *   - If it already exists, its password is reset and it is re-activated —
 *     no duplicate is ever created.
 *   - The SUPER_ADMIN role is (idempotently) attached.
 *
 * To rotate the password later, run the same command again with a new
 * ADMIN_SEED_PASSWORD. The plaintext is bcrypt-hashed (12 rounds) before it
 * ever reaches the database, and is never written to logs.
 */

const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;
const firstName = process.env.ADMIN_SEED_FIRST_NAME?.trim() || 'מנהל';

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!email) fail('ADMIN_SEED_EMAIL is not set.');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('ADMIN_SEED_EMAIL is not a valid email.');
if (!password) fail('ADMIN_SEED_PASSWORD is not set.');
if (password.length < 8) fail('ADMIN_SEED_PASSWORD must be at least 8 characters.');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail('DATABASE_URL is not set. Start the DB with `npm run db:server`.');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordHash = await hash(password!, 12);

  const user = await db.user.upsert({
    where: { email: email! },
    update: { passwordHash, isActive: true, emailVerified: new Date() },
    create: {
      email: email!,
      passwordHash,
      firstName,
      isActive: true,
      emailVerified: new Date(),
    },
    select: { id: true, email: true },
  });

  const superAdmin = await db.role.upsert({
    where: { name: RoleName.SUPER_ADMIN },
    update: {},
    create: { name: RoleName.SUPER_ADMIN, description: 'מנהל־על' },
    select: { id: true },
  });

  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdmin.id } },
    update: {},
    create: { userId: user.id, roleId: superAdmin.id },
  });

  console.log(`✓ SUPER_ADMIN ready for ${user.email}`);
}

main()
  .catch((error) => {
    console.error('✗ Failed to provision admin:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
