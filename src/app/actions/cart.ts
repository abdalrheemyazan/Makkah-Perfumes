'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateCart } from '@/lib/commerce/cart';
import { evaluateCoupon } from '@/lib/commerce/pricing';
import { isValidCouponCode, normalizeCouponCode } from '@/lib/commerce/coupon-code';
import type { CartActionState } from '@/lib/action-state';

const MAX_PER_LINE = 20;

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(MAX_PER_LINE),
});

/**
 * Revalidate only the surfaces that actually render the full cart. The navbar
 * badge is driven client-side from the count these actions return, so there is
 * no need to revalidate the whole `/` layout (which would re-run the entire
 * shell and every server component on the current route).
 */
function revalidateCartSurfaces() {
  revalidatePath('/cart');
  revalidatePath('/checkout');
}

/** Total item quantity in a cart — the one number the navbar badge needs. */
async function cartItemCount(cartId: string): Promise<number> {
  const result = await db.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

/**
 * Adds a variant to the cart.
 *
 * The client sends a variant id and a quantity — never a price. Availability is
 * checked against live inventory here, so a stale page cannot oversell stock.
 */
export async function addToCart(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = addSchema.safeParse({
    variantId: formData.get('variantId'),
    quantity: formData.get('quantity') ?? 1,
  });

  if (!parsed.success) {
    return { status: 'error', messageHe: 'הבקשה אינה תקינה.' };
  }

  const { variantId, quantity } = parsed.data;

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { inventoryItem: true, product: true },
  });

  if (!variant || !variant.isActive || variant.product.status !== 'PUBLISHED') {
    return { status: 'error', messageHe: 'המוצר אינו זמין.' };
  }

  const inventory = variant.inventoryItem;
  const available = inventory
    ? Math.max(0, inventory.quantityOnHand - inventory.quantityReserved)
    : 0;
  const backorderAllowed = inventory?.allowBackorder ?? false;

  if (!backorderAllowed && available < 1) {
    return { status: 'error', messageHe: 'המוצר אזל מהמלאי.' };
  }

  const user = await getCurrentUser();
  const cart = await getOrCreateCart(user?.id);

  const existing = cart.items.find((item) => item.variantId === variantId);
  const requested = (existing?.quantity ?? 0) + quantity;

  if (!backorderAllowed && requested > available) {
    return {
      status: 'error',
      messageHe:
        available === 0
          ? 'המוצר אזל מהמלאי.'
          : `נותרו ${available} יחידות במלאי.`,
    };
  }

  if (requested > MAX_PER_LINE) {
    return { status: 'error', messageHe: `ניתן להזמין עד ${MAX_PER_LINE} יחידות מכל פריט.` };
  }

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: requested },
    create: { cartId: cart.id, variantId, quantity },
  });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

  revalidateCartSurfaces();
  return {
    status: 'success',
    messageHe: 'נוסף לעגלה',
    itemCount: await cartItemCount(cart.id),
  };
}

const updateSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(MAX_PER_LINE),
});

export async function updateCartItem(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = updateSchema.safeParse({
    itemId: formData.get('itemId'),
    quantity: formData.get('quantity'),
  });
  if (!parsed.success) return { status: 'error', messageHe: 'הבקשה אינה תקינה.' };

  const { itemId, quantity } = parsed.data;

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { variant: { include: { inventoryItem: true } } },
  });
  if (!item) return { status: 'error', messageHe: 'הפריט לא נמצא בעגלה.' };

  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    revalidateCartSurfaces();
    return {
      status: 'success',
      messageHe: 'הפריט הוסר מהעגלה',
      itemCount: await cartItemCount(item.cartId),
    };
  }

  const inventory = item.variant.inventoryItem;
  const available = inventory
    ? Math.max(0, inventory.quantityOnHand - inventory.quantityReserved)
    : 0;

  if (!(inventory?.allowBackorder ?? false) && quantity > available) {
    return { status: 'error', messageHe: `נותרו ${available} יחידות במלאי.` };
  }

  await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
  revalidateCartSurfaces();
  return {
    status: 'success',
    messageHe: 'הכמות עודכנה',
    itemCount: await cartItemCount(item.cartId),
  };
}

export async function removeCartItem(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const itemId = String(formData.get('itemId') ?? '');
  if (!itemId) return { status: 'error', messageHe: 'הבקשה אינה תקינה.' };

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    select: { cartId: true },
  });
  await db.cartItem.deleteMany({ where: { id: itemId } });
  revalidateCartSurfaces();
  return {
    status: 'success',
    messageHe: 'הפריט הוסר מהעגלה',
    itemCount: item ? await cartItemCount(item.cartId) : 0,
  };
}

export async function applyCoupon(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const raw = String(formData.get('code') ?? '');
  if (!raw.trim()) return { status: 'error', messageHe: 'יש להזין קוד קופון.' };

  const code = normalizeCouponCode(raw);
  if (!isValidCouponCode(code)) {
    return { status: 'error', messageHe: 'קוד הקופון אינו תקין' };
  }

  const user = await getCurrentUser();
  const cart = await getOrCreateCart(user?.id);

  // Codes are stored normalized, so this is an exact, case-insensitive match.
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) return { status: 'error', messageHe: 'קוד הקופון אינו תקין' };

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.variant.priceAgorot * item.quantity,
    0,
  );

  const userRedemptionCount = user
    ? await db.couponRedemption.count({ where: { couponId: coupon.id, userId: user.id } })
    : 0;

  const evaluation = evaluateCoupon(
    {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minSubtotalAgorot: coupon.minSubtotalAgorot,
      maxDiscountAgorot: coupon.maxDiscountAgorot,
      usageLimit: coupon.usageLimit,
      usageCount: coupon.usageCount,
      perUserLimit: coupon.perUserLimit,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
      isActive: coupon.isActive,
    },
    subtotal,
    { userRedemptionCount },
  );

  if (!evaluation.ok) {
    return { status: 'error', messageHe: evaluation.reasonHe };
  }

  await db.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
  revalidateCartSurfaces();
  return { status: 'success', messageHe: 'הקופון הוחל בהצלחה' };
}

export async function removeCoupon(): Promise<CartActionState> {
  const user = await getCurrentUser();
  const cart = await getOrCreateCart(user?.id);
  await db.cart.update({ where: { id: cart.id }, data: { couponId: null } });
  revalidateCartSurfaces();
  return { status: 'success', messageHe: 'הקופון הוסר' };
}
