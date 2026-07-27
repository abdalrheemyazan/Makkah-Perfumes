import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { shekelsToAgorot } from '../src/lib/commerce/money';
import { isValidCouponCode, normalizeCouponCode } from '../src/lib/commerce/coupon-code';

/**
 * Creates (or safely updates) the public launch coupon from environment values —
 * so no marketing code is ever hardcoded in source.
 *
 *   npm run coupon:create-launch                # dry-run (default)
 *   npm run coupon:create-launch -- --confirm   # write
 *
 * Reads: LAUNCH_COUPON_CODE, LAUNCH_COUPON_TYPE (PERCENTAGE|FIXED_AMOUNT),
 * LAUNCH_COUPON_VALUE (percent or shekels), LAUNCH_COUPON_MIN_SUBTOTAL (shekels,
 * optional), LAUNCH_COUPON_MAX_USES (optional), LAUNCH_COUPON_EXPIRES_AT (ISO
 * date, optional).
 *
 * Idempotent: upserts by normalized code and NEVER overwrites usageCount or the
 * historical redemptions. Refuses obviously test/demo-named codes.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('✗ DATABASE_URL is not set.');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`✗ Missing required env var ${name}.`);
    process.exit(1);
  }
  return v;
}

const rawCode = required('LAUNCH_COUPON_CODE');
const rawType = required('LAUNCH_COUPON_TYPE');
const valueRaw = required('LAUNCH_COUPON_VALUE');

if (rawType !== 'PERCENTAGE' && rawType !== 'FIXED_AMOUNT') {
  console.error('✗ LAUNCH_COUPON_TYPE must be PERCENTAGE or FIXED_AMOUNT.');
  process.exit(1);
}
const type = rawType as 'PERCENTAGE' | 'FIXED_AMOUNT';

const code = normalizeCouponCode(rawCode);
if (!isValidCouponCode(code)) {
  console.error('✗ LAUNCH_COUPON_CODE is not a valid code (A–Z, 0–9, - or _).');
  process.exit(1);
}
if (/TEST|DEMO|EXAMPLE|SAMPLE|DEV/.test(code)) {
  console.error(`✗ Refusing to create a test/demo-named coupon "${code}" for production.`);
  process.exit(1);
}

const numericValue = Number(valueRaw);
if (!Number.isFinite(numericValue) || numericValue <= 0) {
  console.error('✗ LAUNCH_COUPON_VALUE must be a positive number.');
  process.exit(1);
}

let discountValue: number;
if (type === 'PERCENTAGE') {
  if (numericValue < 1 || numericValue > 100) {
    console.error('✗ PERCENTAGE value must be between 1 and 100.');
    process.exit(1);
  }
  discountValue = Math.round(numericValue);
} else {
  discountValue = shekelsToAgorot(numericValue);
}

const minRaw = process.env.LAUNCH_COUPON_MIN_SUBTOTAL?.trim();
const minSubtotalAgorot = minRaw ? shekelsToAgorot(Number(minRaw)) : null;

const maxRaw = process.env.LAUNCH_COUPON_MAX_USES?.trim();
const usageLimit = maxRaw ? Number(maxRaw) : null;
if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) {
  console.error('✗ LAUNCH_COUPON_MAX_USES must be a positive integer.');
  process.exit(1);
}

const expiresRaw = process.env.LAUNCH_COUPON_EXPIRES_AT?.trim();
const endsAt = expiresRaw ? new Date(expiresRaw) : null;
if (endsAt && Number.isNaN(endsAt.getTime())) {
  console.error('✗ LAUNCH_COUPON_EXPIRES_AT is not a valid date.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const existing = await db.coupon.findUnique({
    where: { code },
    select: { id: true, usageCount: true, _count: { select: { redemptions: true } } },
  });

  console.log('\n─── Launch coupon ───\n');
  console.log(`  code:        ${code}`);
  console.log(`  type:        ${type}`);
  console.log(`  value:       ${type === 'PERCENTAGE' ? `${discountValue}%` : `${discountValue} agorot`}`);
  console.log(`  minSubtotal: ${minSubtotalAgorot ?? '—'} agorot`);
  console.log(`  maxUses:     ${usageLimit ?? '—'}`);
  console.log(`  expiresAt:   ${endsAt ? endsAt.toISOString() : '—'}`);
  console.log(`  exists:      ${existing ? `yes (${existing._count.redemptions} redemptions, kept)` : 'no'}`);

  const ruleData = {
    discountType: type,
    discountValue,
    minSubtotalAgorot,
    usageLimit,
    endsAt,
    isActive: true as const,
  };

  if (!confirm) {
    console.log('\n  Dry-run only. Re-run with --confirm to write.\n');
    return;
  }

  // Upsert without ever touching usageCount / redemptions.
  await db.coupon.upsert({
    where: { code },
    create: { code, ...ruleData },
    update: ruleData,
  });

  console.log(`\n  ✓ Coupon "${code}" ${existing ? 'updated' : 'created'} (usage history preserved).\n`);
}

main()
  .catch((error) => {
    console.error('✗ Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
