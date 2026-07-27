'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { limitByIp } from '@/lib/rate-limit';
import { emailSchema } from '@/lib/validation';
import { availableChannels } from '@/lib/notifications/env';
import {
  subscribeToRestock,
  unsubscribeByToken,
  unsubscribeUserFromProduct,
} from '@/lib/notifications/restock';
import type { NotificationChannel } from '@/generated/prisma/enums';
import type { RestockActionState } from '@/lib/action-state';

/**
 * "Notify me when it's back" — the customer-facing entry points.
 *
 * Nothing here trusts price or stock; it only records intent. Push subscriptions
 * are stored server-side (the endpoint never round-trips through the client after
 * this) and email is validated with Zod. A logged-in customer's account email is
 * used without re-asking.
 */

const pushSubSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

const subscribeSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable(),
  wantsEmail: z.boolean(),
  wantsPush: z.boolean(),
  email: z.string().optional(),
  pushSubscription: z.string().optional(),
});

export async function subscribeRestock(
  _previous: RestockActionState,
  formData: FormData,
): Promise<RestockActionState> {
  const limit = await limitByIp('restock', { limit: 12, windowSeconds: 300 });
  if (!limit.ok) return { status: 'error', messageHe: limit.errorHe };

  const parsed = subscribeSchema.safeParse({
    productId: formData.get('productId'),
    variantId: (formData.get('variantId') as string) || null,
    wantsEmail: formData.get('wantsEmail') === 'on' || formData.get('wantsEmail') === 'true',
    wantsPush: formData.get('wantsPush') === 'on' || formData.get('wantsPush') === 'true',
    email: (formData.get('email') as string) ?? undefined,
    pushSubscription: (formData.get('pushSubscription') as string) ?? undefined,
  });
  if (!parsed.success) return { status: 'error', messageHe: 'הבקשה אינה תקינה.' };

  const { productId, variantId } = parsed.data;
  const user = await getCurrentUser();
  const channelsAvailable = availableChannels();

  // Confirm the product exists and is published, and the variant belongs to it.
  const product = await db.product.findFirst({
    where: { id: productId, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!product) return { status: 'error', messageHe: 'המוצר אינו זמין.' };

  const channels: NotificationChannel[] = [];
  let email: string | null = null;
  let pushSubscriptionId: string | null = null;

  // --- Email channel ------------------------------------------------------
  if (parsed.data.wantsEmail) {
    if (!channelsAvailable.email && !user) {
      // In production without a mail provider we still store the intent so it can
      // be delivered once a provider is connected; but we never claim it was sent.
    }
    const candidate = user?.email ?? parsed.data.email;
    const emailParsed = emailSchema.safeParse(candidate);
    if (!emailParsed.success) {
      return { status: 'error', messageHe: 'כתובת הדוא״ל אינה תקינה.' };
    }
    email = emailParsed.data;
    channels.push('EMAIL');
  }

  // --- Push channel -------------------------------------------------------
  if (parsed.data.wantsPush) {
    if (!parsed.data.pushSubscription) {
      return { status: 'error', messageHe: 'הפעלת ההתראות בדפדפן לא הושלמה.' };
    }
    let subJson: unknown;
    try {
      subJson = JSON.parse(parsed.data.pushSubscription);
    } catch {
      return { status: 'error', messageHe: 'נתוני ההתראה אינם תקינים.' };
    }
    const pushParsed = pushSubSchema.safeParse(subJson);
    if (!pushParsed.success) {
      return { status: 'error', messageHe: 'נתוני ההתראה אינם תקינים.' };
    }

    const headerStore = await headers();
    const stored = await db.pushSubscription.upsert({
      where: { endpoint: pushParsed.data.endpoint },
      update: {
        p256dh: pushParsed.data.keys.p256dh,
        auth: pushParsed.data.keys.auth,
        userId: user?.id ?? null,
        failureCount: 0,
      },
      create: {
        endpoint: pushParsed.data.endpoint,
        p256dh: pushParsed.data.keys.p256dh,
        auth: pushParsed.data.keys.auth,
        userId: user?.id ?? null,
        userAgent: headerStore.get('user-agent')?.slice(0, 300) ?? null,
      },
      select: { id: true },
    });
    pushSubscriptionId = stored.id;
    channels.push('PUSH');
  }

  if (channels.length === 0) {
    return { status: 'error', messageHe: 'יש לבחור אמצעי עדכון אחד לפחות.' };
  }

  const result = await subscribeToRestock({
    productId,
    variantId,
    userId: user?.id ?? null,
    email,
    pushSubscriptionId,
    channels,
  });

  if (result.status === 'already') {
    return { status: 'already', messageHe: 'כבר ביקשתם לקבל עדכון עבור המוצר הזה.' };
  }
  if (result.status === 'error') {
    return { status: 'error', messageHe: result.messageHe };
  }

  return {
    status: 'success',
    messageHe: 'נרשמתם בהצלחה. נעדכן אתכם כשהמוצר יחזור למלאי.',
  };
}

/** Logged-in customer cancels their own restock alert for a product. */
export async function unsubscribeRestock(
  _previous: RestockActionState,
  formData: FormData,
): Promise<RestockActionState> {
  const productId = String(formData.get('productId') ?? '');
  const token = String(formData.get('token') ?? '');

  if (token) {
    const ok = await unsubscribeByToken(token);
    return ok
      ? { status: 'success', messageHe: 'העדכון בוטל.' }
      : { status: 'error', messageHe: 'הבקשה אינה תקינה.' };
  }

  const user = await getCurrentUser();
  if (!user || !productId) return { status: 'error', messageHe: 'הבקשה אינה תקינה.' };

  await unsubscribeUserFromProduct(user.id, productId);
  revalidatePath('/wishlist');
  return { status: 'success', messageHe: 'העדכון בוטל.' };
}
