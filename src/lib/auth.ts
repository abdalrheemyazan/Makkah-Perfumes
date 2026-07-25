import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import type { RoleName } from '@/generated/prisma/enums';

/**
 * Session-based authentication.
 *
 * Design notes:
 *  - The session token is high-entropy random, sent to the browser in an
 *    httpOnly cookie and stored in the database only as a SHA-256 hash. A
 *    database leak therefore does not hand an attacker usable sessions.
 *  - Sessions are looked up per request and cached with React `cache`, so a
 *    page that checks auth in five places still issues one query.
 *  - Authentication failures always return the same generic Hebrew message so
 *    the form cannot be used to enumerate registered addresses.
 */

export const SESSION_COOKIE = 'makkah_session';
const SESSION_TTL_DAYS = 30;

export const GENERIC_AUTH_ERROR = 'הדוא״ל או הסיסמה שגויים';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time comparison, used where we compare secrets outside the DB. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  acceptsMarketing: boolean;
  roles: RoleName[];
};

/** Creates a session and sets the cookie. Server Actions / Route Handlers only. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const headerStore = await headers();
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: headerStore.get('user-agent')?.slice(0, 400) ?? null,
      ipAddress: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

/** Destroys the current session both in the database and in the browser. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user, or null. Cached per request.
 * Expired sessions are treated as absent and cleaned up opportunistically.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { include: { roles: { include: { role: true } } } },
    },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    phone: session.user.phone,
    acceptsMarketing: session.user.acceptsMarketing,
    roles: session.user.roles.map((assignment) => assignment.role.name),
  };
});

// ---------------------------------------------------------------------------
// Authorisation
// ---------------------------------------------------------------------------

/** Roles that may open the admin dashboard at all. */
export const ADMIN_ROLES: readonly RoleName[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'ORDER_MANAGER',
  'INVENTORY_MANAGER',
  'SUPPORT_AGENT',
];

export function hasRole(user: SessionUser | null, ...roles: RoleName[]): boolean {
  if (!user) return false;
  return user.roles.some((role) => roles.includes(role));
}

export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, ...ADMIN_ROLES);
}

/**
 * Capability checks. Permissions are expressed as capabilities rather than bare
 * role comparisons so that call sites read as intent, not as an org chart.
 */
export const CAPABILITIES = {
  'products.write': ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'],
  'inventory.write': ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'],
  'orders.write': ['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'],
  'orders.read': ['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT_AGENT'],
  'customers.read': ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT'],
  'messages.read': ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT'],
  'content.write': ['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER'],
  'coupons.write': ['SUPER_ADMIN', 'ADMIN'],
  'reviews.moderate': ['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER'],
  'users.write': ['SUPER_ADMIN'],
  'settings.write': ['SUPER_ADMIN', 'ADMIN'],
  'audit.read': ['SUPER_ADMIN', 'ADMIN'],
} as const satisfies Record<string, readonly RoleName[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(user: SessionUser | null, capability: Capability): boolean {
  if (!user) return false;
  const allowed = CAPABILITIES[capability] as readonly RoleName[];
  return user.roles.some((role) => allowed.includes(role));
}

/** Throws when the current user lacks a capability. Use at the top of mutations. */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!can(user, capability)) {
    throw new AuthorizationError(`חסרה הרשאה: ${capability}`);
  }
  return user!;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError('נדרשת התחברות');
  return user;
}

export class AuthorizationError extends Error {}
