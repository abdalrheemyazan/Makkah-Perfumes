'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { requireCapability } from '@/lib/auth';
import { logAudit } from '@/lib/admin/audit';
import { shekelsToAgorot } from '@/lib/commerce/money';
import { isValidCouponCode, normalizeCouponCode } from '@/lib/commerce/coupon-code';
import type { AdminActionState } from '@/lib/action-state';

/**
 * Coupon management for admins.
 *
 * Coupons are created and edited, and activated/deactivated — never deleted, so
 * historical CouponRedemption rows always keep a valid coupon to point at. Codes
 * are normalized and uniqueness is enforced case-insensitively.
 */

const optionalPositiveInt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? Number(v) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0), 'ערך חייב להיות מספר חיובי');

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const saveSchema = z.object({
  id: z.string().optional().transform((v) => (v && v.length > 0 ? v : null)),
  code: z.string().min(1, 'יש להזין קוד'),
  descriptionHe: z.string().trim().max(120).optional().transform((v) => v || null),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  // Percent (1–100) when PERCENTAGE; shekels when FIXED_AMOUNT.
  discountValue: z.coerce.number().positive('יש להזין ערך חיובי'),
  minSubtotalShekels: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'סכום מינימום שגוי'),
  usageLimit: optionalPositiveInt,
  perUserLimit: optionalPositiveInt,
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z
    .union([z.literal('on'), z.literal('true'), z.literal('')])
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
});

export async function saveCoupon(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('coupons.write');

  const parsed = saveSchema.safeParse({
    id: formData.get('id') ?? undefined,
    code: formData.get('code'),
    descriptionHe: formData.get('descriptionHe') ?? '',
    discountType: formData.get('discountType'),
    discountValue: formData.get('discountValue'),
    minSubtotalShekels: formData.get('minSubtotalShekels') ?? '',
    usageLimit: formData.get('usageLimit') ?? '',
    perUserLimit: formData.get('perUserLimit') ?? '',
    startsAt: formData.get('startsAt') ?? '',
    endsAt: formData.get('endsAt') ?? '',
    isActive: formData.get('isActive') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', messageHe: parsed.error.issues[0]?.message ?? 'בקשה לא תקינה.', errors: {} };
  }

  const code = normalizeCouponCode(parsed.data.code);
  if (!isValidCouponCode(code)) {
    return { status: 'error', messageHe: 'קוד הקופון אינו תקין (אותיות לטיניות, ספרות, - או _).', errors: {} };
  }

  const { discountType } = parsed.data;
  let discountValue: number;
  if (discountType === 'PERCENTAGE') {
    if (parsed.data.discountValue < 1 || parsed.data.discountValue > 100) {
      return { status: 'error', messageHe: 'אחוז ההנחה חייב להיות בין 1 ל־100.', errors: {} };
    }
    discountValue = Math.round(parsed.data.discountValue);
  } else {
    try {
      discountValue = shekelsToAgorot(parsed.data.discountValue);
    } catch {
      return { status: 'error', messageHe: 'סכום ההנחה שגוי.', errors: {} };
    }
  }

  const minSubtotalAgorot =
    parsed.data.minSubtotalShekels != null ? shekelsToAgorot(parsed.data.minSubtotalShekels) : null;

  const startsAt = parsed.data.startsAt ? new Date(`${parsed.data.startsAt}T00:00:00`) : null;
  const endsAt = parsed.data.endsAt ? new Date(`${parsed.data.endsAt}T23:59:59`) : null;
  if (startsAt && endsAt && endsAt < startsAt) {
    return { status: 'error', messageHe: 'תאריך הסיום מוקדם מתאריך ההתחלה.', errors: {} };
  }

  const data = {
    code,
    descriptionHe: parsed.data.descriptionHe,
    discountType,
    discountValue,
    minSubtotalAgorot,
    usageLimit: parsed.data.usageLimit,
    perUserLimit: parsed.data.perUserLimit,
    startsAt,
    endsAt,
    isActive: parsed.data.isActive,
  };

  try {
    if (parsed.data.id) {
      // Editing: the code stays the coupon's identity; changing it is allowed but
      // must not collide with another coupon.
      await db.coupon.update({ where: { id: parsed.data.id }, data });
      await logAudit({ userId: user.id, action: 'coupon.update', entityType: 'Coupon', entityId: parsed.data.id });
    } else {
      const created = await db.coupon.create({ data });
      await logAudit({ userId: user.id, action: 'coupon.create', entityType: 'Coupon', entityId: created.id });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { status: 'error', messageHe: 'קוד קופון זה כבר קיים.', errors: {} };
    }
    throw error;
  }

  revalidatePath('/admin/coupons');
  return { status: 'success', messageHe: 'הקופון נשמר.', errors: {} };
}

export async function toggleCoupon(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('coupons.write');
  const id = String(formData.get('id') ?? '');

  const coupon = await db.coupon.findUnique({ where: { id } });
  if (!coupon) return { status: 'error', messageHe: 'הקופון לא נמצא.', errors: {} };

  await db.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
  await logAudit({
    userId: user.id,
    action: 'coupon.toggle',
    entityType: 'Coupon',
    entityId: id,
    before: { isActive: coupon.isActive },
    after: { isActive: !coupon.isActive },
  });

  revalidatePath('/admin/coupons');
  return {
    status: 'success',
    messageHe: coupon.isActive ? 'הקופון הושבת.' : 'הקופון הופעל.',
    errors: {},
  };
}
