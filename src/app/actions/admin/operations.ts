'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { CATALOG_TAGS } from '@/lib/catalog';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireCapability } from '@/lib/auth';
import { logAudit } from '@/lib/admin/audit';
import { getPaymentProvider } from '@/lib/commerce/payment';
import { crossedIntoStock } from '@/lib/commerce/inventory';
import { scheduleRestockNotifications } from '@/lib/notifications/trigger';
import type { AdminActionState } from '@/lib/action-state';

/**
 * Order, inventory and moderation mutations.
 *
 * Anything that touches stock or money runs inside a transaction and writes an
 * inventory movement, so the current quantity is always explainable from its
 * history rather than being a number someone typed.
 */

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

const FULFILLMENT_STATUSES = [
  'UNFULFILLED',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'RETURNED',
] as const;

export async function updateOrderStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('orders.write');

  const parsed = z
    .object({
      orderId: z.string().min(1),
      status: z.enum(ORDER_STATUSES),
    })
    .safeParse({ orderId: formData.get('orderId'), status: formData.get('status') });

  if (!parsed.success) return { status: 'error', messageHe: 'בקשה לא תקינה.', errors: {} };

  const order = await db.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return { status: 'error', messageHe: 'ההזמנה לא נמצאה.', errors: {} };

  if (order.status === parsed.data.status) {
    return { status: 'error', messageHe: 'ההזמנה כבר בסטטוס הזה.', errors: {} };
  }

  // Inventory-affecting transitions must not go through this generic setter,
  // which does not touch stock. Cancelling must release the reservation (use the
  // cancel action); reactivating a cancelled order would silently sell stock that
  // was never re-reserved. Both are refused here (Part 17).
  if (parsed.data.status === 'CANCELLED') {
    return {
      status: 'error',
      messageHe: 'לביטול הזמנה יש להשתמש בפעולת הביטול, כדי לשחרר את המלאי המשוריין.',
      errors: {},
    };
  }
  if (order.status === 'CANCELLED') {
    return {
      status: 'error',
      messageHe: 'לא ניתן להחזיר הזמנה מבוטלת לפעילות מכאן — המלאי שוחרר. יש ליצור הזמנה חדשה.',
      errors: {},
    };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: parsed.data.status },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'order.status',
        messageHe: `סטטוס ההזמנה שונה ל־${parsed.data.status}`,
        actorId: user.id,
      },
    });
  });

  await logAudit({
    userId: user.id,
    action: 'order.status',
    entityType: 'Order',
    entityId: order.id,
    before: { status: order.status },
    after: { status: parsed.data.status },
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  return { status: 'success', messageHe: 'סטטוס ההזמנה עודכן.', errors: {} };
}

export async function updateFulfillment(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('orders.write');

  const parsed = z
    .object({
      orderId: z.string().min(1),
      fulfillmentStatus: z.enum(FULFILLMENT_STATUSES),
    })
    .safeParse({
      orderId: formData.get('orderId'),
      fulfillmentStatus: formData.get('fulfillmentStatus'),
    });

  if (!parsed.success) return { status: 'error', messageHe: 'בקשה לא תקינה.', errors: {} };

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: { include: { variant: { include: { inventoryItem: true } } } } },
  });
  if (!order) return { status: 'error', messageHe: 'ההזמנה לא נמצאה.', errors: {} };

  const becomingFulfilled =
    parsed.data.fulfillmentStatus === 'FULFILLED' && order.fulfillmentStatus !== 'FULFILLED';

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { fulfillmentStatus: parsed.data.fulfillmentStatus },
    });

    // Fulfilment converts a reservation into an actual stock decrement.
    if (becomingFulfilled) {
      for (const item of order.items) {
        const inventory = item.variant?.inventoryItem;
        if (!inventory) continue;

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: { decrement: item.quantity },
            quantityReserved: {
              decrement: Math.min(item.quantity, inventory.quantityReserved),
            },
          },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: inventory.id,
            delta: -item.quantity,
            reason: 'ORDER_FULFILLED',
            orderId: order.id,
            createdByUserId: user.id,
            note: `סופק בהזמנה ${order.orderNumber}`,
          },
        });
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'order.fulfillment',
        messageHe: `סטטוס האספקה שונה ל־${parsed.data.fulfillmentStatus}`,
        actorId: user.id,
      },
    });
  });

  await logAudit({
    userId: user.id,
    action: 'order.fulfillment',
    entityType: 'Order',
    entityId: order.id,
    before: { fulfillmentStatus: order.fulfillmentStatus },
    after: { fulfillmentStatus: parsed.data.fulfillmentStatus },
  });

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath('/admin/inventory');
  return { status: 'success', messageHe: 'סטטוס האספקה עודכן.', errors: {} };
}

/** Cancels an order and releases the stock it was holding. */
export async function cancelOrder(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('orders.write');
  const orderId = String(formData.get('orderId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { inventoryItem: true } } } } },
  });
  if (!order) return { status: 'error', messageHe: 'ההזמנה לא נמצאה.', errors: {} };
  if (order.status === 'CANCELLED') {
    return { status: 'error', messageHe: 'ההזמנה כבר בוטלה.', errors: {} };
  }
  if (order.fulfillmentStatus === 'FULFILLED') {
    return {
      status: 'error',
      messageHe: 'לא ניתן לבטל הזמנה שכבר סופקה. יש לבצע החזרה.',
      errors: {},
    };
  }

  // Variants whose availability crosses back above zero when the reservation is
  // released — subscribers to those get a "back in stock" notification.
  const restockedVariantIds: string[] = [];

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // Give the reserved units back to the sellable pool.
    for (const item of order.items) {
      const inventory = item.variant?.inventoryItem;
      if (!inventory || !item.variantId) continue;
      const release = Math.min(item.quantity, inventory.quantityReserved);
      if (release <= 0) continue;

      const crossed = crossedIntoStock(
        { quantityOnHand: inventory.quantityOnHand, quantityReserved: inventory.quantityReserved },
        { quantityOnHand: inventory.quantityOnHand, quantityReserved: inventory.quantityReserved - release },
      );
      if (crossed) restockedVariantIds.push(item.variantId);

      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: { quantityReserved: { decrement: release } },
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: inventory.id,
          delta: release,
          reason: 'ORDER_RELEASED',
          orderId: order.id,
          createdByUserId: user.id,
          note: `שוחרר מביטול הזמנה ${order.orderNumber}`,
        },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'order.cancelled',
        messageHe: reason ? `ההזמנה בוטלה: ${reason}` : 'ההזמנה בוטלה',
        actorId: user.id,
      },
    });
  });

  // Only after the release has committed: tell subscribers the item is back.
  for (const variantId of new Set(restockedVariantIds)) {
    scheduleRestockNotifications(variantId);
  }

  await logAudit({
    userId: user.id,
    action: 'order.cancel',
    entityType: 'Order',
    entityId: order.id,
    before: { status: order.status },
    after: { status: 'CANCELLED' },
    note: reason || undefined,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  return { status: 'success', messageHe: 'ההזמנה בוטלה והמלאי שוחרר.', errors: {} };
}

/** Refund through the provider adapter. In development mode no money moves. */
export async function refundOrder(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('orders.write');
  const orderId = String(formData.get('orderId') ?? '');

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) return { status: 'error', messageHe: 'ההזמנה לא נמצאה.', errors: {} };

  const payment = order.payments.find((p) => p.status === 'PAID');
  if (!payment) {
    return { status: 'error', messageHe: 'אין תשלום שניתן להחזר.', errors: {} };
  }

  const provider = getPaymentProvider();
  const result = await provider.refund(payment.providerReference ?? '', payment.amountAgorot);

  if (!result.ok) {
    return { status: 'error', messageHe: result.errorHe, errors: {} };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', refundedAgorot: payment.amountAgorot },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'payment.refunded',
        messageHe: provider.isLive
          ? 'בוצע החזר תשלום'
          : 'בוצע החזר במצב פיתוח (לא הוחזר כסף אמיתי)',
        actorId: user.id,
      },
    });
  });

  await logAudit({
    userId: user.id,
    action: 'order.refund',
    entityType: 'Order',
    entityId: order.id,
    after: { provider: provider.id, isLive: provider.isLive, amountAgorot: payment.amountAgorot },
  });

  revalidatePath(`/admin/orders/${order.id}`);
  return {
    status: 'success',
    messageHe: provider.isLive ? 'ההחזר בוצע.' : 'ההחזר נרשם במצב פיתוח.',
    errors: {},
  };
}

export async function addOrderNote(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('orders.write');
  const orderId = String(formData.get('orderId') ?? '');
  const note = String(formData.get('internalNote') ?? '').trim();

  if (!orderId) return { status: 'error', messageHe: 'בקשה לא תקינה.', errors: {} };

  await db.order.update({ where: { id: orderId }, data: { internalNote: note || null } });
  await logAudit({
    userId: user.id,
    action: 'order.note',
    entityType: 'Order',
    entityId: orderId,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return { status: 'success', messageHe: 'ההערה נשמרה.', errors: {} };
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

const adjustSchema = z.object({
  inventoryItemId: z.string().min(1),
  // Signed delta: negative removes stock.
  delta: z.coerce.number().int().refine((n) => n !== 0, 'יש להזין כמות שונה מאפס'),
  reason: z.enum([
    'MANUAL_ADJUSTMENT',
    'RETURN_RESTOCK',
    'DAMAGE_WRITE_OFF',
    'INITIAL_STOCK',
  ]),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});

export async function adjustInventory(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('inventory.write');

  const parsed = adjustSchema.safeParse({
    inventoryItemId: formData.get('inventoryItemId'),
    delta: formData.get('delta'),
    reason: formData.get('reason'),
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      messageHe: parsed.error.issues[0]?.message ?? 'בקשה לא תקינה.',
      errors: {},
    };
  }

  const item = await db.inventoryItem.findUnique({
    where: { id: parsed.data.inventoryItemId },
    include: { variant: { include: { product: true } } },
  });
  if (!item) return { status: 'error', messageHe: 'פריט המלאי לא נמצא.', errors: {} };

  const next = item.quantityOnHand + parsed.data.delta;
  // Stock must never go negative — that would let the shop oversell silently.
  if (next < 0) {
    return {
      status: 'error',
      messageHe: `לא ניתן להוריד ${Math.abs(parsed.data.delta)} יחידות — במלאי יש ${item.quantityOnHand} בלבד.`,
      errors: {},
    };
  }
  if (next < item.quantityReserved) {
    return {
      status: 'error',
      messageHe: `לא ניתן לרדת מתחת ל־${item.quantityReserved} יחידות המשוריינות להזמנות פתוחות.`,
      errors: {},
    };
  }

  // Zero-to-positive restock transition (Part 10): reserved is unchanged by a
  // manual adjustment, so only quantityOnHand moves.
  const becameAvailable = crossedIntoStock(
    { quantityOnHand: item.quantityOnHand, quantityReserved: item.quantityReserved },
    { quantityOnHand: next, quantityReserved: item.quantityReserved },
  );

  await db.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: next },
    });
    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        delta: parsed.data.delta,
        reason: parsed.data.reason,
        createdByUserId: user.id,
        note: parsed.data.note || null,
      },
    });
  });

  // Trigger notification processing exactly once, only on the true transition,
  // and only after the stock write has committed.
  if (becameAvailable) {
    scheduleRestockNotifications(item.variantId);
  }

  await logAudit({
    userId: user.id,
    action: 'inventory.adjust',
    entityType: 'InventoryItem',
    entityId: item.id,
    before: { quantityOnHand: item.quantityOnHand },
    after: { quantityOnHand: next, reason: parsed.data.reason },
    note: parsed.data.note || undefined,
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  updateTag(CATALOG_TAGS.products);

  return {
    status: 'success',
    messageHe: becameAvailable
      ? `המלאי של ${item.variant.product.nameHe} עודכן ל־${next}. המוצר חזר למלאי. עדכוני זמינות נשלחים לנרשמים.`
      : `המלאי של ${item.variant.product.nameHe} עודכן ל־${next}.`,
    errors: {},
  };
}

// ---------------------------------------------------------------------------
// Review moderation
// ---------------------------------------------------------------------------

export async function moderateReview(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('reviews.moderate');
  const reviewId = String(formData.get('reviewId') ?? '');
  const status = String(formData.get('status') ?? '');

  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return { status: 'error', messageHe: 'סטטוס לא תקין.', errors: {} };
  }

  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return { status: 'error', messageHe: 'הביקורת לא נמצאה.', errors: {} };

  await db.review.update({
    where: { id: reviewId },
    data: { status: status as 'APPROVED' | 'REJECTED' | 'PENDING' },
  });

  await logAudit({
    userId: user.id,
    action: 'review.moderate',
    entityType: 'Review',
    entityId: reviewId,
    before: { status: review.status },
    after: { status },
  });

  revalidatePath('/admin/reviews');
  revalidatePath(`/shop/${review.productId}`);
  return { status: 'success', messageHe: 'הביקורת עודכנה.', errors: {} };
}
