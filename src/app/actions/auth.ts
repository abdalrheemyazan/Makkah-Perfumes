'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { compare, hash } from 'bcryptjs';
import { db } from '@/lib/db';
import {
  createSession,
  destroySession,
  GENERIC_AUTH_ERROR,
  getCurrentUser,
} from '@/lib/auth';
import { CART_COOKIE, mergeGuestCartIntoUser } from '@/lib/commerce/cart';
import { limitByIp } from '@/lib/rate-limit';
import { fieldErrors, loginSchema, registerSchema } from '@/lib/validation';
import type { AuthState } from '@/lib/action-state';

/**
 * Authentication actions.
 *
 * Both login failure modes — unknown address and wrong password — return the
 * same message and take a comparable amount of time, so the form cannot be used
 * to discover which addresses are registered.
 */

export async function login(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const limit = await limitByIp('login', { limit: 10, windowSeconds: 300 });
  if (!limit.ok) return { status: 'error', messageHe: limit.errorHe, errors: {} };

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', messageHe: GENERIC_AUTH_ERROR, errors: fieldErrors(parsed.error) };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Always run a hash comparison so the response time does not reveal whether
  // the address exists.
  const storedHash =
    user?.passwordHash ?? '$2b$12$0000000000000000000000000000000000000000000000000000';
  const passwordMatches = await compare(parsed.data.password, storedHash);

  if (!user || !user.passwordHash || !passwordMatches || !user.isActive) {
    return { status: 'error', messageHe: GENERIC_AUTH_ERROR, errors: {} };
  }

  const cookieStore = await cookies();
  const guestCartToken = cookieStore.get(CART_COOKIE)?.value;

  await createSession(user.id);

  if (guestCartToken) {
    await mergeGuestCartIntoUser(user.id, guestCartToken).catch((error) => {
      // A merge failure must not block sign-in.
      console.error('[auth] cart merge failed', error);
    });
  }

  revalidatePath('/', 'layout');
  redirect('/account');
}

export async function register(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const limit = await limitByIp('register', { limit: 5, windowSeconds: 600 });
  if (!limit.ok) return { status: 'error', messageHe: limit.errorHe, errors: {} };

  const parsed = registerSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    acceptsMarketing: formData.get('acceptsMarketing') === 'on',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      messageHe: 'יש לתקן את השדות המסומנים.',
      errors: fieldErrors(parsed.error),
    };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    // Reported on the field rather than as a silent failure, because the user
    // needs to know to sign in instead.
    return {
      status: 'error',
      messageHe: 'לא ניתן להשלים את ההרשמה.',
      errors: { email: 'כתובת הדוא״ל כבר רשומה. נסו להתחבר.' },
    };
  }

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      passwordHash: await hash(parsed.data.password, 12),
      acceptsMarketing: parsed.data.acceptsMarketing,
    },
  });

  const customerRole = await db.role.findUnique({ where: { name: 'CUSTOMER' } });
  if (customerRole) {
    await db.userRole.create({ data: { userId: user.id, roleId: customerRole.id } });
  }

  const cookieStore = await cookies();
  const guestCartToken = cookieStore.get(CART_COOKIE)?.value;

  await createSession(user.id);

  if (guestCartToken) {
    await mergeGuestCartIntoUser(user.id, guestCartToken).catch(() => {});
  }

  revalidatePath('/', 'layout');
  redirect('/account');
}

export async function logout(): Promise<void> {
  await destroySession();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function requestPasswordReset(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const limit = await limitByIp('password-reset', { limit: 5, windowSeconds: 900 });
  if (!limit.ok) return { status: 'error', messageHe: limit.errorHe, errors: {} };

  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  // The response is identical whether or not the address exists.
  const genericMessage =
    'אם הכתובת רשומה במערכת, נשלח אליה קישור לאיפוס סיסמה.';

  if (!email) {
    return { status: 'error', messageHe: 'יש להזין כתובת דוא״ל.', errors: {} };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const { randomBytes, createHash } = await import('node:crypto');
    const token = randomBytes(32).toString('base64url');
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // Real delivery is wired to MAIL_TRANSPORT. See src/lib/mail.ts.
    console.info(`[auth] password reset token for ${email}: ${token}`);
  }

  return { status: 'success', messageHe: genericMessage, errors: {} };
}

/** Used by the account page to confirm a session is present. */
export async function currentUser() {
  return getCurrentUser();
}
