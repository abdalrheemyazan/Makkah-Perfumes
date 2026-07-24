/**
 * Local PostgreSQL server for development.
 *
 * Runs a real PostgreSQL binary in-process via `embedded-postgres`, so the project
 * gets genuine Postgres (enums, transactions, migrations) without requiring Docker
 * or a system-wide Postgres install.
 *
 * In production you point DATABASE_URL at a managed Postgres and never run this.
 * See docs/DEPLOYMENT.md.
 *
 *   node scripts/db-server.mjs          # start and stay in foreground
 *   node scripts/db-server.mjs --stop   # stop a previously started instance
 */
import EmbeddedPostgres from 'embedded-postgres';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, '.postgres-data');

const PORT = Number(process.env.LOCAL_PG_PORT ?? 55432);
const USER = process.env.LOCAL_PG_USER ?? 'makkah';
const PASSWORD = process.env.LOCAL_PG_PASSWORD ?? 'makkah_dev_password';
const DB_NAME = process.env.LOCAL_PG_DB ?? 'makkah_perfumes';

mkdirSync(dataDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
  // Windows initdb otherwise defaults to the system codepage (WIN1252), which
  // cannot store Hebrew. The whole site is Hebrew, so UTF8 is mandatory.
  initdbFlags: ['--encoding=UTF8', '--lc-collate=C', '--lc-ctype=C'],
  onLog: () => {},
  onError: (err) => {
    const message = String(err);
    // Postgres logs benign startup notices to stderr; only surface real failures.
    if (/FATAL|PANIC/.test(message)) console.error('[postgres]', message);
  },
});

async function main() {
  // `initialise` fails harmlessly when the cluster already exists on disk.
  try {
    await pg.initialise();
    console.log('[db] initialised new cluster at .postgres-data');
  } catch {
    console.log('[db] reusing existing cluster at .postgres-data');
  }

  await pg.start();
  console.log(`[db] postgres listening on port ${PORT}`);

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`[db] created database "${DB_NAME}"`);
  } catch {
    console.log(`[db] database "${DB_NAME}" already exists`);
  }

  console.log(
    `[db] DATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}?schema=public"`,
  );
  console.log('[db] ready — press Ctrl+C to stop');

  const shutdown = async () => {
    console.log('\n[db] stopping…');
    try {
      await pg.stop();
    } catch {
      /* already stopped */
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.argv.includes('--stop')) {
  await pg.stop().catch(() => {});
  console.log('[db] stopped');
} else {
  await main();
}
