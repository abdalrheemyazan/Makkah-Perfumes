import 'dotenv/config';
import pg from 'pg';

/**
 * Removes E2E product fixtures from the ISOLATED test database after the run,
 * so nothing accumulates. It targets ONLY test-pattern products (E2E-/TEST-
 * SKUs or the test name prefixes); the 13 official products (MKP- SKUs) are
 * never matched. It only ever touches TEST_DATABASE_URL.
 *
 * Uses the raw pg driver rather than the generated Prisma client — Playwright's
 * loader cannot import the client's TypeScript entry, and a plain SQL DELETE on
 * Product cascades to variants/images/etc. via the FK constraints (OrderItem's
 * variant FK is ON DELETE SET NULL, so any order snapshot is preserved).
 *
 * Runs even when tests fail (Playwright global teardown) and is defensive: any
 * error here must not mask a test failure.
 */
export default async function globalTeardown() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) return;
  try {
    if (!/test/i.test(new URL(testUrl).pathname)) return;
  } catch {
    return;
  }

  const client = new pg.Client({ connectionString: testUrl });
  try {
    await client.connect();
    const result = await client.query(
      `DELETE FROM "Product"
       WHERE "nameEn" LIKE 'Test Fragrance%'
          OR "nameHe" LIKE 'בושם בדיקה%'
          OR id IN (
            SELECT "productId" FROM "ProductVariant"
            WHERE sku LIKE 'E2E-%' OR sku LIKE 'TEST-%'
          )`,
    );
    if (result.rowCount) {
      console.log(`[e2e] teardown removed ${result.rowCount} test product(s) from the test database.`);
    }
  } catch (error) {
    console.warn('[e2e] teardown cleanup skipped:', error instanceof Error ? error.message : error);
  } finally {
    await client.end().catch(() => {});
  }
}
