'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { WishlistState } from '@/lib/action-state';

/**
 * Toggles a product in the signed-in user's wishlist.
 * Guests are told to sign in rather than silently losing the action.
 */
export async function toggleWishlist(
  _previous: WishlistState,
  formData: FormData,
): Promise<WishlistState> {
  const productId = String(formData.get('productId') ?? '');
  if (!productId) return { status: 'error', messageHe: 'הבקשה אינה תקינה.' };

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      messageHe: 'יש להתחבר כדי לשמור מוצרים',
      requiresLogin: true,
    };
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { status: 'error', messageHe: 'המוצר לא נמצא.' };

  const wishlist = await db.wishlist.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const existing = await db.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath('/wishlist');
    revalidatePath('/', 'layout');
    return { status: 'removed', messageHe: 'הוסר מרשימת המשאלות' };
  }

  await db.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
  revalidatePath('/wishlist');
  revalidatePath('/', 'layout');
  return { status: 'added', messageHe: 'נוסף לרשימת המשאלות' };
}
