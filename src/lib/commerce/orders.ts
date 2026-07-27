import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { calculateCartTotals, type CouponRules, type DeliveryMethod } from './pricing';
import { variantLabel } from './labels';
import { getPaymentProvider } from './payment';
import { reserveStock } from './inventory';

/** True when `error` is a PostgreSQL unique-constraint violation touching `field`. */
function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta?.target ?? '').includes(field)
  );
}

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
  shippingMethod?: 'SELF_PICKUP' | 'REGULAR' | 'EXPRESS';
  address: {
    firstName: string;
    lastName: string;
    phone: string;
    street?: string;
    houseNumber?: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    city?: string;
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

  const runOrderTransaction = () => db.$transaction(async (tx) => {
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
    if (cart.convertedToOrderId) {
      const existingConverted = await tx.order.findUnique({
        where: { id: cart.convertedToOrderId },
        select: { id: true, orderNumber: true, totalAgorot: true, isDevelopmentOrder: true },
      });
      if (existingConverted) {
        return {
          order: existingConverted as unknown as { id: string; orderNumber: string; isDevelopmentOrder: boolean },
          totals: { totalAgorot: existingConverted.totalAgorot } as unknown as { totalAgorot: number },
          isExisting: true,
        };
      }
    }
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
    const isPickup = input.shippingMethod === 'SELF_PICKUP' || input.deliveryMethod === 'STORE_PICKUP';
    const address = isPickup
      ? null
      : await tx.address.create({
          data: {
            userId: input.userId,
            kind: 'SHIPPING',
            firstName: input.address.firstName,
            lastName: input.address.lastName,
            phone: input.address.phone,
            street: input.address.street || 'איסוף עצמי',
            houseNumber: input.address.houseNumber || '1',
            apartment: input.address.apartment || null,
            entrance: input.address.entrance || null,
            floor: input.address.floor || null,
            city: input.address.city || 'איסוף עצמי',
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
        shippingAddressId: address?.id ?? null,
        billingAddressId: address?.id ?? null,
        deliveryMethod: input.deliveryMethod,
        shippingMethod: input.shippingMethod ?? (input.deliveryMethod === 'EXPRESS_DELIVERY' ? 'EXPRESS' : input.deliveryMethod === 'STORE_PICKUP' ? 'SELF_PICKUP' : 'REGULAR'),
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

    // --- Reserve stock atomically -----------------------------------------
    // The earlier per-line read above is a fast, friendly pre-check. The real
    // guarantee is here: reserveStock is a conditional UPDATE that reserves only
    // if the units are still available at commit time. Two checkouts racing for
    // the last bottle serialize on the row lock; the loser matches zero rows and
    // the whole order is rolled back. Stock can never go negative or oversell.
    for (const item of cart.items) {
      const inventory = item.variant.inventoryItem;
      if (!inventory) continue;

      const reserved = await reserveStock(tx, inventory.id, item.quantity);
      if (!reserved) {
        throw new CheckoutError(
          `המלאי של ${item.variant.product.nameHe} השתנה ואין מספיק יחידות זמינות. עדכנו את הכמות ונסו שוב.`,
        );
      }

      // One movement per (order, item, reason); the DB unique constraint makes a
      // repeated deduction for the same order impossible even under retries.
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

  // Run the order transaction, tolerating the two concurrency races that can
  // surface as unique-constraint violations.
  let created: Awaited<ReturnType<typeof runOrderTransaction>>;
  for (let attempt = 0; ; attempt++) {
    try {
      created = await runOrderTransaction();
      break;
    } catch (error) {
      // Same idempotency key won the race just before us — return that order
      // rather than failing (double-click, retry, refresh, function retry).
      if (isUniqueViolation(error, 'idempotencyKey')) {
        const dup = await db.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { id: true, orderNumber: true, totalAgorot: true, isDevelopmentOrder: true },
        });
        if (dup) {
          return {
            orderId: dup.id,
            orderNumber: dup.orderNumber,
            totalAgorot: dup.totalAgorot,
            isDevelopmentOrder: dup.isDevelopmentOrder,
          };
        }
      }
      // Two different carts computed the same human order number simultaneously.
      // The transaction rolled back (including its reservation); regenerate and
      // retry a bounded number of times.
      if (isUniqueViolation(error, 'orderNumber') && attempt < 4) continue;
      throw error;
    }
  }

  if ((created as { isExisting?: boolean }).isExisting) {
    return {
      orderId: created.order.id,
      orderNumber: created.order.orderNumber,
      totalAgorot: created.totals.totalAgorot,
      isDevelopmentOrder: created.order.isDevelopmentOrder,
    };
  }

  // --- Payment ------------------------------------------------------------
  // With no live gateway connected, the order is placed as PENDING and is never
  // marked PAID. No fake authorization runs and no card is requested; payment is
  // coordinated manually after the order is confirmed. When a real provider is
  // registered (`provider.isLive === true`), the authorize→PAID flow below runs.
  if (!provider.isLive) {
    await db.orderEvent.create({
      data: {
        orderId: created.order.id,
        type: 'order.awaiting_payment',
        messageHe: 'ההזמנה התקבלה. פרטי התשלום והמשלוח יתואמו לאחר אישור ההזמנה.',
      },
    });
    return {
      orderId: created.order.id,
      orderNumber: created.order.orderNumber,
      totalAgorot: created.totals.totalAgorot,
      isDevelopmentOrder: !provider.isLive,
    };
  }

  // --- Authorise payment outside the transaction (live providers only) ----
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
