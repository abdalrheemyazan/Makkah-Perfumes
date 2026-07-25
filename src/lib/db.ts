import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Single shared Prisma client.
 *
 * Next.js dev mode re-evaluates modules on every hot reload, which would open a
 * new connection pool each time. Caching on globalThis keeps exactly one pool —
 * and on Netlify the same trick reuses one pool across warm invocations of a
 * function instance instead of opening a fresh pool per request.
 *
 * Pool sizing for serverless:
 *   Each concurrent function instance gets its own pool. With pg's default
 *   `max: 10`, a burst of traffic multiplies instances × 10 and exhausts the
 *   managed Postgres connection limit. A small `max` per instance keeps the
 *   total bounded; the platform scales by adding instances, not connections.
 *   `allowExitOnIdle` lets idle pools release so a frozen instance stops holding
 *   a connection, and the timeouts fail fast instead of hanging a request while
 *   the database is waking from sleep.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const isProduction = process.env.NODE_ENV === 'production';

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    // Serverless: keep the per-instance footprint tiny. Locally (long-lived dev
    // server) a slightly larger pool avoids queuing during hot reloads.
    max: isProduction ? 2 : 5,
    // Fail fast rather than hanging the whole request if the pool is saturated
    // or the database is cold. The friendly Hebrew timeout is handled upstream.
    connectionTimeoutMillis: 10_000,
    // Release idle connections quickly so a frozen instance frees them.
    idleTimeoutMillis: 10_000,
    // Let the pool drain fully when idle, which is what we want on serverless.
    allowExitOnIdle: isProduction,
  });
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env, then run `npm run db:server`.',
    );
  }

  const pool = globalForPrisma.pgPool ?? createPool(connectionString);
  if (!isProduction) globalForPrisma.pgPool = pool;

  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: isProduction ? ['error'] : ['warn', 'error'],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (!isProduction) {
  globalForPrisma.prisma = db;
}
