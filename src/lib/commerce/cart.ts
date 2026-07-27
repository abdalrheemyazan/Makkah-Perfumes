import 'server-only';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import {
  calculateCartTotals,
  type CartTotals,
  type CouponRules,
  type DeliveryMethod,
} from './pricing';
import { variantLabel } from './labels';

export const CART_COOKIE = 'makkah_cart';
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

/**
 * The cart lives in the database, not the browser.
 *
 * The cookie holds only an opaque token. Quantities, prices and stock are all
 * resolved server-side on every read, so a tampered client can change what it
 * *asks for* but never what it *pays*.
 */

export type CartLine = {
  itemId: string;
  variantId: string;
  productSlug: string;
  productNameHe: string;
  productNameEn: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  imageAltHe: string;
  unitPriceAgorot: number;
  compareAtAgorot: number | null;
  pricingVerified: boolean;
  quantity: number;
  lineTotalAgorot: number;
  /** How many units can actually be bought right now. */
  availableQuantity: number;
  /** True when the requested quantity exceeds what is in stock. */
  exceedsStock: boolean;
};

export type CartView = {
  id: string | null;
  token: string | null;
  lines: CartLine[];
  itemCount: number;
  totals: CartTotals;
  couponCode: string | null;
  couponErrorHe: string | null;
  hasStockProblem: boolean;
};

const EMPTY_TOTALS: CartTotals = {
  lines: [],
  subtotalAgorot: 0,
  discountAgorot: 0,
  shippingAgorot: 0,
  taxAgorot: 0,
  totalAgorot: 0,
  appliedCouponCode: null,
  couponErrorHe: null,
};

export const EMPTY_CART: CartView = {
  id: null,
  token: null,
  lines: [],
  itemCount: 0,
  totals: EMPTY_TOTALS,
  couponCode: null,
  couponErrorHe: null,
  hasStockProblem: false,
};

const cartInclude = {
  coupon: true,
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          inventoryItem: true,
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
    },
  },
} as const;

type CartRow = NonNullable<Awaited<ReturnType<typeof loadCartByToken>>>;

async function loadCartByToken(token: string) {
  return db.cart.findUnique({ where: { token }, include: cartInclude });
}

function toCouponRules(coupon: CartRow['coupon']): CouponRules | null {
  if (!coupon) return null;
  return {
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
  };
}

/** Projects a database cart row into the shape the UI consumes. */
export function projectCart(
  cart: CartRow,
  deliveryMethod?: DeliveryMethod | null,
): CartView {
  const lines: CartLine[] = cart.items.map((item) => {
    const { variant } = item;
    const inventory = variant.inventoryItem;
    const available = inventory
      ? Math.max(0, inventory.quantityOnHand - inventory.quantityReserved)
      : 0;
    const image = variant.product.images[0] ?? null;

    return {
      itemId: item.id,
      variantId: variant.id,
      productSlug: variant.product.slug,
      productNameHe: variant.product.nameHe,
      productNameEn: variant.product.nameEn,
      variantLabel: variantLabel(variant.volumeMl, variant.concentration),
      sku: variant.sku,
      imageUrl: image?.url ?? null,
      imageAltHe: image?.altHe ?? variant.product.nameHe,
      unitPriceAgorot: variant.priceAgorot,
      compareAtAgorot: variant.compareAtAgorot,
      pricingVerified: variant.product.pricingVerified,
      quantity: item.quantity,
      lineTotalAgorot: variant.priceAgorot * item.quantity,
      availableQuantity: available,
      exceedsStock: item.quantity > available && !inventory?.allowBackorder,
    };
  });

  const totals = calculateCartTotals({
    lines: lines.map((line) => ({
      variantId: line.variantId,
      unitPriceAgorot: line.unitPriceAgorot,
      quantity: line.quantity,
    })),
    coupon: toCouponRules(cart.coupon),
    deliveryMethod,
  });

  return {
    id: cart.id,
    token: cart.token,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    totals,
    couponCode: totals.appliedCouponCode,
    couponErrorHe: totals.couponErrorHe,
    hasStockProblem: lines.some((line) => line.exceedsStock),
  };
}

export type CartSummary = {
  token: string | null;
  itemCount: number;
};

const EMPTY_SUMMARY: CartSummary = { token: null, itemCount: 0 };

/**
 * Reads only what the global header needs: the total item quantity.
 *
 * This is deliberately cheap — a single aggregate over `CartItem.quantity` with
 * no variant, product, image, inventory or coupon joins — because it runs on
 * *every* navigation to render the navbar badge. The full `readCart()` (with all
 * relations and price/stock recomputation) is reserved for `/cart` and checkout.
 */
export async function readCartSummary(): Promise<CartSummary> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return EMPTY_SUMMARY;

  const result = await db.cartItem.aggregate({
    where: { cart: { token } },
    _sum: { quantity: true },
  });

  return { token, itemCount: result._sum.quantity ?? 0 };
}

/**
 * Reads the current cart. Safe to call from Server Components — it never writes
 * a cookie, so a visitor without a cart simply gets the empty view.
 */
export async function readCart(
  deliveryMethod?: DeliveryMethod | null,
): Promise<CartView> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return EMPTY_CART;

  const cart = await loadCartByToken(token);
  if (!cart) return EMPTY_CART;

  return projectCart(cart, deliveryMethod);
}

/**
 * Returns the cart for the current visitor, creating one if needed.
 * Sets a cookie, so this may only be called from a Server Action or Route Handler.
 */
export async function getOrCreateCart(userId?: string | null) {
  const store = await cookies();
  const existingToken = store.get(CART_COOKIE)?.value;

  if (existingToken) {
    const existing = await loadCartByToken(existingToken);
    if (existing) {
      // Claim an anonymous cart once the visitor signs in.
      if (userId && !existing.userId) {
        await db.cart.update({ where: { id: existing.id }, data: { userId } });
      }
      return existing;
    }
  }

  const token = nanoid(32);
  await db.cart.create({ data: { token, userId: userId ?? null } });

  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE,
  });

  return (await loadCartByToken(token))!;
}

/**
 * Merges an anonymous cart into the signed-in user's existing cart.
 * Quantities are summed and then clamped to available stock.
 */
export async function mergeGuestCartIntoUser(userId: string, guestToken: string) {
  const guestCart = await loadCartByToken(guestToken);
  if (!guestCart || guestCart.items.length === 0) return;

  const userCart = await db.cart.findFirst({
    where: { userId, convertedToOrderId: null, NOT: { token: guestToken } },
    include: cartInclude,
    orderBy: { updatedAt: 'desc' },
  });

  if (!userCart) {
    await db.cart.update({ where: { id: guestCart.id }, data: { userId } });
    return;
  }

  await db.$transaction(async (tx) => {
    for (const guestItem of guestCart.items) {
      const existing = userCart.items.find((item) => item.variantId === guestItem.variantId);
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + guestItem.quantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: userCart.id,
            variantId: guestItem.variantId,
            quantity: guestItem.quantity,
          },
        });
      }
    }
    await tx.cart.delete({ where: { id: guestCart.id } });
  });
}
