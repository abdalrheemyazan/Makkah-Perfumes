import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Pool } from 'pg';

/**
 * Conservative, opt-in repair for CLEARLY invalid inventory rows only.
 *
 *   npm run db:repair-commerce                 # dry-run: report what would change
 *   npm run db:repair-commerce -- --confirm    # back up, then apply
 *
 * Safety:
 *  - Dry-run by default; nothing changes without --confirm.
 *  - Refuses to run against production unless ALLOW_PRODUCTION_REPAIR=true.
 *  - Takes a JSON backup (npm run db:backup) before applying anything.
 *  - Only fixes unambiguously-invalid values: negative quantityOnHand and
 *    negative quantityReserved are floored to 0. It NEVER invents missing orders,
 *    customers, prices or snapshots, and it never touches reserved>onHand rows
 *    (those need human judgement) — it only reports them.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set.');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');
const isProduction = process.env.NODE_ENV === 'production';
const allowProduction = process.env.ALLOW_PRODUCTION_REPAIR === 'true';

if (isProduction && !allowProduction) {
  console.error('✗ Refusing to run in production. Set ALLOW_PRODUCTION_REPAIR=true to override.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function count(sql: string): Promise<number> {
  const r = await pool.query(sql);
  return Number(r.rows[0]?.count ?? 0);
}

async function main() {
  const negativeOnHand = await count('SELECT count(*) FROM "InventoryItem" WHERE "quantityOnHand" < 0');
  const negativeReserved = await count('SELECT count(*) FROM "InventoryItem" WHERE "quantityReserved" < 0');
  const reservedOverHand = await count('SELECT count(*) FROM "InventoryItem" WHERE "quantityReserved" > "quantityOnHand"');

  console.log('\n─── תיקון מסחר (סקירה) ───\n');
  console.log(`  ${negativeOnHand}  שורות עם quantityOnHand שלילי  → יתוקן ל־0`);
  console.log(`  ${negativeReserved}  שורות עם quantityReserved שלילי → יתוקן ל־0`);
  console.log(`  ${reservedOverHand}  שורות עם reserved > onHand      → דיווח בלבד (דורש בדיקה ידנית)`);

  const fixable = negativeOnHand + negativeReserved;

  if (fixable === 0) {
    console.log('\n  ✓ אין מה לתקן.\n');
    return;
  }

  if (!confirm) {
    console.log('\n  זו סקירה בלבד. להחלה: npm run db:repair-commerce -- --confirm\n');
    return;
  }

  // Back up before any write.
  console.log('\n[repair] יוצר גיבוי לפני שינוי…');
  execSync('npm run db:backup', { stdio: 'inherit' });

  const applied = await pool.query(`
    WITH a AS (
      UPDATE "InventoryItem" SET "quantityOnHand" = 0 WHERE "quantityOnHand" < 0 RETURNING 1
    ), b AS (
      UPDATE "InventoryItem" SET "quantityReserved" = 0 WHERE "quantityReserved" < 0 RETURNING 1
    )
    SELECT (SELECT count(*) FROM a) + (SELECT count(*) FROM b) AS count`);

  console.log(`\n  ✓ תוקנו ${Number(applied.rows[0].count)} שורות.`);
  if (reservedOverHand > 0) {
    console.log(`  ! ${reservedOverHand} שורות reserved>onHand נותרו — בדקו ידנית מול ההזמנות הפתוחות.`);
  }
  console.log('');
}

main()
  .catch((error) => {
    console.error('✗ Repair failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => pool.end());
