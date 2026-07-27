import 'server-only';
import { db } from '@/lib/db';
import { SITE } from '@/lib/site';
import { availableQuantity } from '@/lib/commerce/inventory';
import { sendPush, endpointOrigin } from './push';
import { sendRestockEmail } from '@/lib/mail';
import type { NotificationChannel } from '@/generated/prisma/enums';

/**
 * "Notify me when it's back" — subscriptions and delivery.
 *
 * Design guarantees:
 *  - A customer cannot hold two ACTIVE subscriptions for the same product/variant
 *    through the same identity (account, email or push endpoint).
 *  - Delivery is idempotent: only ACTIVE subscriptions are processed, and a
 *    successful send flips the row to NOTIFIED, so re-running the job — from a
 *    duplicate trigger, a retry, or the fallback endpoint — never double-sends.
 *  - A failed send stays ACTIVE (with FAILED status recorded) so it can be
 *    retried; it is never silently lost.
 */

export type SubscribeInput = {
  productId: string;
  variantId: string | null;
  userId: string | null;
  email: string | null;
  pushSubscriptionId: string | null;
  channels: NotificationChannel[];
  locale?: string;
};

export type SubscribeResult =
  | { status: 'created'; unsubscribeToken: string }
  | { status: 'already' }
  | { status: 'error'; messageHe: string };

/** Creates a restock subscription, refusing exact duplicates. */
export async function subscribeToRestock(input: SubscribeInput): Promise<SubscribeResult> {
  const channels = [...new Set(input.channels)];
  if (channels.length === 0) {
    return { status: 'error', messageHe: 'יש לבחור לפחות אמצעי עדכון אחד.' };
  }
  if (channels.includes('EMAIL') && !input.email) {
    return { status: 'error', messageHe: 'נדרשת כתובת דוא״ל לקבלת עדכון באימייל.' };
  }
  if (channels.includes('PUSH') && !input.pushSubscriptionId) {
    return { status: 'error', messageHe: 'לא נמצא מנוי התראות בדפדפן.' };
  }

  // Duplicate guard: an ACTIVE subscription for the same product/variant reached
  // through the same identity is treated as "already subscribed".
  const identityOr = [
    input.userId ? { userId: input.userId } : null,
    input.email ? { email: input.email } : null,
    input.pushSubscriptionId ? { pushSubscriptionId: input.pushSubscriptionId } : null,
  ].filter((v): v is NonNullable<typeof v> => v !== null);

  if (identityOr.length > 0) {
    const existing = await db.restockSubscription.findFirst({
      where: {
        status: 'ACTIVE',
        productId: input.productId,
        variantId: input.variantId,
        OR: identityOr,
      },
      select: { id: true },
    });
    if (existing) return { status: 'already' };
  }

  const created = await db.restockSubscription.create({
    data: {
      productId: input.productId,
      variantId: input.variantId,
      userId: input.userId,
      email: input.email,
      pushSubscriptionId: input.pushSubscriptionId,
      channels,
      locale: input.locale ?? 'he',
    },
    select: { unsubscribeToken: true },
  });

  return { status: 'created', unsubscribeToken: created.unsubscribeToken };
}

/** Unsubscribes by token. Idempotent — a second call is a no-op success. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const sub = await db.restockSubscription.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, status: true },
  });
  if (!sub) return false;
  if (sub.status === 'UNSUBSCRIBED') return true;
  await db.restockSubscription.update({
    where: { id: sub.id },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
  });
  return true;
}

/** Unsubscribes a logged-in user from a product's restock alert. */
export async function unsubscribeUserFromProduct(
  userId: string,
  productId: string,
): Promise<number> {
  const result = await db.restockSubscription.updateMany({
    where: { userId, productId, status: 'ACTIVE' },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
  });
  return result.count;
}

/** Whether the given identity already has an ACTIVE subscription for a product. */
export async function findActiveSubscription(params: {
  productId: string;
  variantId: string | null;
  userId: string | null;
  email: string | null;
}): Promise<boolean> {
  const identityOr = [
    params.userId ? { userId: params.userId } : null,
    params.email ? { email: params.email } : null,
  ].filter((v): v is NonNullable<typeof v> => v !== null);
  if (identityOr.length === 0) return false;

  const existing = await db.restockSubscription.findFirst({
    where: { status: 'ACTIVE', productId: params.productId, variantId: params.variantId, OR: identityOr },
    select: { id: true },
  });
  return existing !== null;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

type ProcessSummary = { notified: number; failed: number; skipped: number };

/**
 * Notifies every ACTIVE subscriber that `variantId` is back — but only if it is
 * genuinely available now. Safe to call repeatedly; NOTIFIED rows are skipped.
 */
export async function processRestockForVariant(variantId: string): Promise<ProcessSummary> {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: {
      inventoryItem: true,
      product: {
        select: {
          id: true,
          slug: true,
          nameHe: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      },
    },
  });
  if (!variant) return { notified: 0, failed: 0, skipped: 0 };

  // Never notify on stale/incorrect triggers: re-check live availability.
  if (availableQuantity(variant.inventoryItem) <= 0) {
    return { notified: 0, failed: 0, skipped: 0 };
  }

  const subs = await db.restockSubscription.findMany({
    where: {
      status: 'ACTIVE',
      OR: [{ variantId }, { variantId: null, productId: variant.product.id }],
    },
    include: { pushSubscription: true },
  });

  const productUrl = `${SITE.url}/shop/${variant.product.slug}`;
  const imageUrl = variant.product.images[0]?.url ?? null;

  const summary: ProcessSummary = { notified: 0, failed: 0, skipped: 0 };

  for (const sub of subs) {
    const outcome = await deliverOne(sub, {
      productNameHe: variant.product.nameHe,
      productUrl,
      imageUrl,
      variantId,
    });
    summary[outcome] += 1;
  }

  return summary;
}

/**
 * Fallback / retry job: scans every ACTIVE subscription and notifies those whose
 * product is now available. Idempotent and self-healing — this is what a cron or
 * a manual "process pending" call runs.
 */
export async function processAllPendingRestocks(): Promise<ProcessSummary> {
  const variantIds = await db.restockSubscription.findMany({
    where: { status: 'ACTIVE', variantId: { not: null } },
    select: { variantId: true },
    distinct: ['variantId'],
  });

  const summary: ProcessSummary = { notified: 0, failed: 0, skipped: 0 };
  for (const { variantId } of variantIds) {
    if (!variantId) continue;
    const partial = await processRestockForVariant(variantId);
    summary.notified += partial.notified;
    summary.failed += partial.failed;
    summary.skipped += partial.skipped;
  }
  return summary;
}

type DeliveryContext = {
  productNameHe: string;
  productUrl: string;
  imageUrl: string | null;
  variantId: string;
};

async function deliverOne(
  sub: {
    id: string;
    channels: NotificationChannel[];
    email: string | null;
    unsubscribeToken: string;
    pushSubscription: { id: string; endpoint: string; p256dh: string; auth: string } | null;
  },
  ctx: DeliveryContext,
): Promise<'notified' | 'failed' | 'skipped'> {
  let anyDelivered = false;
  let anyAttempted = false;
  const errors: string[] = [];

  const unsubscribeUrl = `${SITE.url}/restock/unsubscribe?token=${sub.unsubscribeToken}`;

  if (sub.channels.includes('PUSH') && sub.pushSubscription) {
    anyAttempted = true;
    const result = await sendPush(sub.pushSubscription, {
      title: 'המוצר חזר למלאי',
      body: `${ctx.productNameHe} זמין שוב ב-${SITE.nameEn}.`,
      url: ctx.productUrl,
      icon: '/icons/icon-192.png',
      image: ctx.imageUrl ?? undefined,
      tag: `restock-${ctx.variantId}`,
    });
    if (result.ok) {
      anyDelivered = true;
    } else {
      errors.push(`push:${result.error}@${endpointOrigin(sub.pushSubscription.endpoint)}`);
      // Prune a subscription the browser has revoked so it stops being retried.
      if (result.expired) {
        await db.pushSubscription
          .delete({ where: { id: sub.pushSubscription.id } })
          .catch(() => {});
      }
    }
  }

  if (sub.channels.includes('EMAIL') && sub.email) {
    anyAttempted = true;
    try {
      const { delivered } = await sendRestockEmail({
        to: sub.email,
        productNameHe: ctx.productNameHe,
        productUrl: ctx.productUrl,
        unsubscribeUrl,
      });
      if (delivered) anyDelivered = true;
      else errors.push('email:no-transport');
    } catch (error) {
      errors.push(`email:${error instanceof Error ? error.message : 'failed'}`);
    }
  }

  if (anyDelivered) {
    await db.restockSubscription.update({
      where: { id: sub.id },
      data: { status: 'NOTIFIED', notifiedAt: new Date(), lastDeliveryStatus: 'SENT', lastError: null },
    });
    return 'notified';
  }

  if (!anyAttempted) {
    // No usable channel right now — leave ACTIVE for a later retry.
    await db.restockSubscription.update({
      where: { id: sub.id },
      data: { lastDeliveryStatus: 'SKIPPED', lastError: 'no-available-channel' },
    });
    return 'skipped';
  }

  await db.restockSubscription.update({
    where: { id: sub.id },
    data: { lastDeliveryStatus: 'FAILED', lastError: errors.join('; ').slice(0, 400) },
  });
  return 'failed';
}
