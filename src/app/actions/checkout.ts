'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { CART_COOKIE } from '@/lib/commerce/cart';
import { CheckoutError, createOrder } from '@/lib/commerce/orders';
import { sendOrderConfirmation } from '@/lib/mail';
import { limitByIp } from '@/lib/rate-limit';
import { checkoutSchema, fieldErrors } from '@/lib/validation';
import type { CheckoutState } from '@/lib/action-state';

export async function placeOrder(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const limit = await limitByIp('checkout', { limit: 10, windowSeconds: 300 });
  if (!limit.ok) {
    return { status: 'error', messageHe: limit.errorHe, errors: {} };
  }

  const parsed = checkoutSchema.safeParse({
    email: formData.get('email'),
    deliveryMethod: formData.get('deliveryMethod') ?? undefined,
    shippingMethod: formData.get('shippingMethod') ?? undefined,
    customerNote: formData.get('customerNote') ?? '',
    address: {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      street: formData.get('street'),
      houseNumber: formData.get('houseNumber'),
      apartment: formData.get('apartment') ?? '',
      entrance: formData.get('entrance') ?? '',
      floor: formData.get('floor') ?? '',
      city: formData.get('city'),
      postalCode: formData.get('postalCode') ?? '',
      notes: formData.get('notes') ?? '',
    },
  });

  if (!parsed.success) {
    return {
      status: 'error',
      messageHe: 'יש לתקן את השדות המסומנים.',
      errors: fieldErrors(parsed.error),
    };
  }

  const idempotencyKey = String(formData.get('idempotencyKey') ?? '').trim();
  if (!idempotencyKey) {
    return { status: 'error', messageHe: 'הבקשה אינה תקינה.', errors: {} };
  }

  const cookieStore = await cookies();
  const cartToken = cookieStore.get(CART_COOKIE)?.value;
  if (!cartToken) {
    return { status: 'error', messageHe: 'העגלה ריקה.', errors: {} };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: 'error', messageHe: 'יש להתחבר לחשבון כדי להשלים את ההזמנה.', errors: {} };
  }

  let orderNumber: string;
  try {
    const shippingMethod = parsed.data.shippingMethod ?? 'SELF_PICKUP';
    const result = await createOrder({
      cartToken,
      userId: user.id,
      email: parsed.data.email,
      deliveryMethod:
        shippingMethod === 'SELF_PICKUP'
          ? 'STORE_PICKUP'
          : shippingMethod === 'EXPRESS'
            ? 'EXPRESS_DELIVERY'
            : 'STANDARD_DELIVERY',
      shippingMethod,
      address: {
        firstName: parsed.data.address.firstName,
        lastName: parsed.data.address.lastName,
        phone: parsed.data.address.phone,
        street: parsed.data.address.street || 'איסוף עצמי',
        houseNumber: parsed.data.address.houseNumber || '1',
        city: parsed.data.address.city || 'איסוף עצמי',
        apartment: parsed.data.address.apartment || undefined,
        entrance: parsed.data.address.entrance || undefined,
        floor: parsed.data.address.floor || undefined,
        postalCode: parsed.data.address.postalCode || undefined,
        notes: parsed.data.address.notes || undefined,
      },
      customerNote: parsed.data.customerNote || undefined,
      idempotencyKey,
    });
    orderNumber = result.orderNumber;

    // Email failure must never lose a paid order, so it is reported, not thrown.
    await sendOrderConfirmation({
      to: parsed.data.email,
      orderNumber: result.orderNumber,
      totalAgorot: result.totalAgorot,
      isDevelopmentOrder: result.isDevelopmentOrder,
    }).catch((error) => {
      console.error('[checkout] confirmation email failed', error);
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { status: 'error', messageHe: error.messageHe, errors: {} };
    }
    console.error('[checkout] order creation failed', error);
    return {
      status: 'error',
      messageHe: 'לא הצלחנו להשלים את ההזמנה. נסו שוב.',
      errors: {},
    };
  }

  revalidatePath('/', 'layout');
  // Redirect must happen outside the try block — Next signals it by throwing.
  redirect(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
}
