import 'server-only';
import { db } from '@/lib/db';
import { calculateCartTotals, type CouponRules, type DeliveryMethod } from './pricing';
import { variantLabel } from './labels';
import { getPaymentProvider } from './payment';

/**
 * Order creation.
 *
 * This is the one place where money becomes a commitment, so it is deliberately
 * paranoid:
 *
 *   - Prices are re-read from the database inside the transaction. Nothing the
 *     browser sent about price, discount or total is trusted or even consulted.
 *   - Stock is re-checked inside the transaction, then reserved in the same
 *     transaction, so two shoppers racing for the last bottle cannot both win.
 *   - An idempotency key makes a double-submit (or a retried request) return the
 *     original order rather than creating a second one.
 *   - Everything below is atomic: if any step throws, no order, no reservation
 *     and no coupon redemption survives.
 */

export class CheckoutError extends Error {
  constructor(readonly messageHe: string) {
    super(messageHe);
  }
}

export type CreateOrderInput = {
  cartToken: string;
  userId: string | null;
  email: string;
  deliveryMethod: DeliveryMethod;
  address: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    houseNumber: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    city: string;
    postalCode?: string;
    notes?: string;
  };
  customerNote?: string;
  idempotencyKey: string;
};

export type CreateOrderResult = {
  orderId: string;
  orderNumber: string;
  totalAgorot: number;
  isDevelopmentOrder: boolean;
};

/** Builds a human-readable order number, retrying if two orders race. */
async function nextOrderNumber(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MK-${year}-`;

  const latest = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  const lastSequence = latest ? Number.parseInt(latest.orderNumber.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;
  return `${prefix}${String(next).padStart(6, '0')}`;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // Idempotency: a repeated submit returns the order that already exists.
  const existing = await db.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true, orderNumber: true, totalAgorot: true, isDevelopmentOrder: true },
  });
  if (existing) {
    return {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      totalAgorot: existing.totalAgorot,
      isDevelopmentOrder: existing.isDevelopmentOrder,
    };
  }

  const provider = getPaymentProvider();

  const created = await db.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { token: input.cartToken },
      include: {
        coupon: true,
        items: {
          include: {
            variant: {
              include: {
                inventoryItem: true,
                product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
              },
            },
          },
        },
      },
    });

    if (!cart) throw new CheckoutError('העגלה לא נמצאה.');
    if (cart.convertedToOrderId) throw new CheckoutError('העגלה כבר הומרה להזמנה.');
    if (cart.items.length === 0) throw new CheckoutError('העגלה ריקה.');

    // --- Re-validate every line against live data -------------------------
    for (const item of cart.items) {
      const { variant } = item;

      if (!variant.isActive || variant.product.status !== 'PUBLISHED') {
        throw new CheckoutError(`המוצר ${variant.product.nameHe} אינו זמין יותר.`);
      }

      const inventory = variant.inventoryItem;
      const available = inventory
        ? Math.max(0, inventory.quantityOnHand - inventory.quantityReserved)
        : 0;

      if (!(inventory?.allowBackorder ?? false) && item.quantity > available) {
        throw new CheckoutError(
          available === 0
            ? `המוצר ${variant.product.nameHe} אזל מהמלאי.`
            : `נותרו ${available} יחידות בלבד מהמוצר ${variant.product.nameHe}.`,
        );
      }
    }

    // --- Recompute totals from database prices ----------------------------
    const couponRules: CouponRules | null = cart.coupon
      ? {
          code: cart.coupon.code,
          discountType: cart.coupon.discountType,
          discountValue: cart.coupon.discountValue,
          minSubtotalAgorot: cart.coupon.minSubtotalAgorot,
          maxDiscountAgorot: cart.coupon.maxDiscountAgorot,
          usageLimit: cart.coupon.usageLimit,
          usageCount: cart.coupon.usageCount,
          perUserLimit: cart.coupon.perUserLimit,
          startsAt: cart.coupon.startsAt,
          endsAt: cart.coupon.endsAt,
          isActive: cart.coupon.isActive,
        }
      : null;

    const userRedemptionCount =
      input.userId && cart.couponId
        ? await tx.couponRedemption.count({
            where: { couponId: cart.couponId, userId: input.userId },
          })
        : 0;

    const totals = calculateCartTotals({
      lines: cart.items.map((item) => ({
        variantId: item.variantId,
        unitPriceAgorot: item.variant.priceAgorot,
        quantity: item.quantity,
      })),
      coupon: couponRules,
      deliveryMethod: input.deliveryMethod,
      userRedemptionCount,
    });

    // A coupon that stopped being valid must not silently vanish from the total.
    if (couponRules && totals.couponErrorHe) {
      throw new CheckoutError(`הקופון אינו תקף יותר: ${totals.couponErrorHe}`);
    }

    // --- Address ----------------------------------------------------------
    const address = await tx.address.create({
      data: {
        userId: input.userId,
        kind: 'SHIPPING',
        firstName: input.address.firstName,
        lastName: input.address.lastName,
        phone: input.address.phone,
        street: input.address.street,
        houseNumber: input.address.houseNumber,
        apartment: input.address.apartment || null,
        entrance: input.address.entrance || null,
        floor: input.address.floor || null,
        city: input.address.city,
        postalCode: input.address.postalCode || null,
        notes: input.address.notes || null,
      },
    });

    // --- Order ------------------------------------------------------------
    const orderNumber = await nextOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        orderNumber,
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
        guestEmail: input.userId ? null : input.email,
        guestPhone: input.userId ? null : input.address.phone,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        shippingAddressId: address.id,
        billingAddressId: address.id,
        deliveryMethod: input.deliveryMethod,
        subtotalAgorot: totals.subtotalAgorot,
        discountAgorot: totals.discountAgorot,
        shippingAgorot: totals.shippingAgorot,
        taxAgorot: totals.taxAgorot,
        totalAgorot: totals.totalAgorot,
        couponId: cart.couponId,
        couponCode: totals.appliedCouponCode,
        customerNote: input.customerNote || null,
        isDevelopmentOrder: !provider.isLive,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            // Snapshot: the order must not change when the catalogue does.
            productNameHe: item.variant.product.nameHe,
            productNameEn: item.variant.product.nameEn,
            productSlug: item.variant.product.slug,
            variantSku: item.variant.sku,
            variantLabel: variantLabel(item.variant.volumeMl, item.variant.concentration),
            imageUrl: item.variant.product.images[0]?.url ?? null,
            unitPriceAgorot: item.variant.priceAgorot,
            quantity: item.quantity,
            lineTotalAgorot: item.variant.priceAgorot * item.quantity,
          })),
        },
      },
    });

    // --- Reserve stock ----------------------------------------------------
    for (const item of cart.items) {
      const inventory = item.variant.inventoryItem;
      if (!inventory) continue;

      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: { quantityReserved: { increment: item.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: inventory.id,
          delta: -item.quantity,
          reason: 'ORDER_RESERVED',
          orderId: order.id,
          note: `שוריין להזמנה ${orderNumber}`,
        },
      });
    }

    // --- Coupon redemption -------------------------------------------------
    if (cart.couponId && totals.discountAgorot >= 0 && totals.appliedCouponCode) {
      await tx.coupon.update({
        where: { id: cart.couponId },
        data: { usageCount: { increment: 1 } },
      });
      await tx.couponRedemption.create({
        data: {
          couponId: cart.couponId,
          orderId: order.id,
          userId: input.userId,
          discountAgorot: totals.discountAgorot,
        },
      });
    }

    // --- Payment record ----------------------------------------------------
    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: provider.id,
        status: 'PENDING',
        amountAgorot: totals.totalAgorot,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'order.created',
        messageHe: `ההזמנה ${orderNumber} נוצרה`,
      },
    });

    // --- Retire the cart ---------------------------------------------------
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({
      where: { id: cart.id },
      data: { convertedToOrderId: order.id, couponId: null },
    });

    return { order, totals };
  });

  // --- Authorise payment outside the transaction --------------------------
  // Network calls must not hold a database transaction open.
  const authorization = await provider.authorize({
    orderId: created.order.id,
    orderNumber: created.order.orderNumber,
    amountAgorot: created.totals.totalAgorot,
    customerEmail: input.email,
  });

  if (!authorization.ok) {
    await db.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId: created.order.id },
        data: { status: 'FAILED', failureReason: authorization.failureCode },
      });
      await tx.order.update({
        where: { id: created.order.id },
        data: { paymentStatus: 'FAILED' },
      });
      await tx.orderEvent.create({
        data: {
          orderId: created.order.id,
          type: 'payment.failed',
          messageHe: `התשלום נכשל: ${authorization.errorHe}`,
        },
      });
    });
    throw new CheckoutError(authorization.errorHe);
  }

  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId: created.order.id },
      data: { status: 'PAID', providerReference: authorization.providerReference },
    });
    await tx.order.update({
      where: { id: created.order.id },
      data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
    });
    await tx.orderEvent.create({
      data: {
        orderId: created.order.id,
        type: 'payment.paid',
        messageHe: authorization.isDevelopment
          ? 'תשלום אושר במצב פיתוח (לא בוצע חיוב אמיתי)'
          : 'התשלום אושר',
      },
    });
  });

  return {
    orderId: created.order.id,
    orderNumber: created.order.orderNumber,
    totalAgorot: created.totals.totalAgorot,
    isDevelopmentOrder: !provider.isLive,
  };
}
