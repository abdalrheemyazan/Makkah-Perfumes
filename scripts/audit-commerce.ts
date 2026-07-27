import 'dotenv/config';
import { Pool } from 'pg';

/**
 * Read-only commerce & inventory audit.
 *
 *   npm run db:audit-commerce
 *
 * Prints counts and flags integrity problems across products, variants,
 * inventory, orders, movements and restock subscriptions. It performs SELECTs
 * only — it never writes. No personal customer data (names, emails, addresses)
 * is printed; only aggregate counts and opaque ids.
 *
 * Exit code: 0 when healthy, 1 when a CRITICAL inconsistency is found, so it can
 * gate a deploy. Warnings alone do not fail.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set. Start the DB with `npm run db:server`.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function scalar(sql: string): Promise<number> {
  const result = await pool.query(sql);
  return Number(result.rows[0]?.count ?? result.rows[0]?.n ?? 0);
}

type Line = { label: string; value: number; level: 'info' | 'warn' | 'critical' };

async function main() {
  const lines: Line[] = [];
  const add = (label: string, value: number, level: Line['level'] = 'info') =>
    lines.push({ label, value, level });

  // --- Catalogue ----------------------------------------------------------
  add('מוצרים (סה״כ)', await scalar('SELECT count(*) FROM "Product"'));
  add('וריאנטים (סה״כ)', await scalar('SELECT count(*) FROM "ProductVariant"'));
  add('שורות מלאי (סה״כ)', await scalar('SELECT count(*) FROM "InventoryItem"'));

  // Products none of whose variants have an inventory row.
  add(
    'מוצרים ללא מלאי כלל',
    await scalar(`
      SELECT count(*) FROM "Product" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "ProductVariant" v
        JOIN "InventoryItem" i ON i."variantId" = v.id
        WHERE v."productId" = p.id
      )`),
    'warn',
  );

  add(
    'וריאנטים ללא מלאי',
    await scalar(`
      SELECT count(*) FROM "ProductVariant" v
      WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" i WHERE i."variantId" = v.id)`),
    'warn',
  );

  // --- Inventory integrity (critical) ------------------------------------
  add('מלאי פיזי שלילי (quantityOnHand < 0)', await scalar('SELECT count(*) FROM "InventoryItem" WHERE "quantityOnHand" < 0'), 'critical');
  add('שריון שלילי (quantityReserved < 0)', await scalar('SELECT count(*) FROM "InventoryItem" WHERE "quantityReserved" < 0'), 'critical');
  add(
    'שריון גדול מהמלאי (reserved > onHand)',
    await scalar('SELECT count(*) FROM "InventoryItem" WHERE "quantityReserved" > "quantityOnHand"'),
    'critical',
  );

  // --- Orders -------------------------------------------------------------
  add(
    'הזמנות ללא פריטים',
    await scalar(`
      SELECT count(*) FROM "Order" o
      WHERE NOT EXISTS (SELECT 1 FROM "OrderItem" oi WHERE oi."orderId" = o.id)`),
    'warn',
  );

  // Snapshot completeness: an order item must carry its own name/sku/price so the
  // order never mutates when the catalogue changes.
  add(
    'פריטי הזמנה עם צילום מצב חסר',
    await scalar(`
      SELECT count(*) FROM "OrderItem"
      WHERE "productNameHe" = '' OR "variantSku" = '' OR "unitPriceAgorot" <= 0`),
    'warn',
  );

  add('תנועות מלאי המקושרות להזמנות', await scalar('SELECT count(*) FROM "InventoryMovement" WHERE "orderId" IS NOT NULL'));

  // Double-deduction detector: more than one movement of the same reason for the
  // same order+item. The unique constraint should keep this at zero.
  add(
    'חשד לניכוי כפול (order+item+reason כפול)',
    await scalar(`
      SELECT count(*) FROM (
        SELECT 1 FROM "InventoryMovement"
        WHERE "orderId" IS NOT NULL
        GROUP BY "orderId", "inventoryItemId", reason
        HAVING count(*) > 1
      ) d`),
    'critical',
  );

  // --- Restock subscriptions ---------------------------------------------
  add('מנויי חזרה למלאי פעילים (ACTIVE)', await scalar(`SELECT count(*) FROM "RestockSubscription" WHERE status = 'ACTIVE'`));
  add('מנויים שכבר עודכנו (NOTIFIED)', await scalar(`SELECT count(*) FROM "RestockSubscription" WHERE status = 'NOTIFIED'`));
  add('מנויי push שמורים', await scalar('SELECT count(*) FROM "PushSubscription"'));

  // --- Contact requests --------------------------------------------------
  add('פניות (סה״כ)', await scalar('SELECT count(*) FROM "ContactMessage"'));
  add('פניות חדשות (NEW)', await scalar(`SELECT count(*) FROM "ContactMessage" WHERE status = 'NEW'`));
  // Missing required fields — should never happen given server validation.
  add(
    'פניות עם שדות חובה חסרים',
    await scalar(`
      SELECT count(*) FROM "ContactMessage"
      WHERE btrim(name) = '' OR btrim(email) = '' OR btrim(subject) = '' OR btrim(message) = ''`),
    'warn',
  );
  // Duplicate submissions (same sender + subject + message) — a double-click that
  // slipped past the pending-state guard would show up here.
  add(
    'חשד לפנייה כפולה (email+subject+message זהים)',
    await scalar(`
      SELECT count(*) FROM (
        SELECT 1 FROM "ContactMessage"
        GROUP BY email, subject, message
        HAVING count(*) > 1
      ) d`),
    'warn',
  );

  // --- Report -------------------------------------------------------------
  console.log('\n─── ביקורת מסחר ומלאי (קריאה בלבד) ───\n');
  let critical = 0;
  let warnings = 0;
  for (const line of lines) {
    const flag =
      line.level === 'critical' && line.value > 0
        ? '  ✗ קריטי'
        : line.level === 'warn' && line.value > 0
          ? '  ! אזהרה'
          : '';
    if (line.level === 'critical' && line.value > 0) critical += 1;
    if (line.level === 'warn' && line.value > 0) warnings += 1;
    console.log(`  ${String(line.value).padStart(6)}  ${line.label}${flag}`);
  }
  console.log('\n────────────────────────────────────');
  if (critical > 0) {
    console.log(`  ✗ ${critical} בעיות קריטיות. הריצו npm run db:repair-commerce -- --confirm לאחר בדיקה.`);
  } else if (warnings > 0) {
    console.log(`  ! ${warnings} אזהרות (לא קריטי).`);
  } else {
    console.log('  ✓ לא נמצאו בעיות.');
  }
  console.log('');

  process.exitCode = critical > 0 ? 1 : 0;
}

main()
  .catch((error) => {
    console.error('✗ Audit failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => pool.end());
