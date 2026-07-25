import 'dotenv/config';
import { execSync } from 'node:child_process';
import pg from 'pg';

/**
 * One-time setup of the ISOLATED end-to-end test database.
 *
 * Playwright must never touch the development database, so E2E runs against
 * TEST_DATABASE_URL (a separate database whose name contains "test"). This
 * script creates it on the same local PostgreSQL cluster, applies migrations,
 * and seeds the 13 official products.
 *
 *   npm run db:test-setup
 *
 * Safe: it only ever creates/migrates/seeds the TEST database, never the dev one.
 */

const devUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;

function die(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!devUrl) die('DATABASE_URL is not set (needed to reach the cluster). Run `npm run db:server`.');
if (!testUrl) die('TEST_DATABASE_URL is not set. Add it to .env (see .env.example).');
if (testUrl === devUrl) die('TEST_DATABASE_URL must be different from DATABASE_URL.');

const testName = new URL(testUrl).pathname.slice(1).split('?')[0];
if (!/test/i.test(testName)) die(`Test database name "${testName}" must contain "test".`);

const admin = new URL(devUrl);
console.log(`Cluster: ${admin.hostname}:${admin.port || '5432'} · creating database "${testName}" if missing…`);

// Connect to the existing dev database purely to issue CREATE DATABASE.
const client = new pg.Client({ connectionString: devUrl });
await client.connect();
const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testName]);
if (exists.rowCount === 0) {
  // Identifier is validated above to contain "test"; quote it defensively.
  await client.query(`CREATE DATABASE "${testName.replace(/"/g, '')}"`);
  console.log(`✓ Created database "${testName}".`);
} else {
  console.log(`• Database "${testName}" already exists.`);
}
await client.end();

const env = { ...process.env, DATABASE_URL: testUrl };
console.log('Applying migrations to the test database…');
execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
console.log('Seeding the test database…');
execSync('npm run db:seed', { stdio: 'inherit', env });

console.log(`\n✓ Test database ready: ${testName}`);
