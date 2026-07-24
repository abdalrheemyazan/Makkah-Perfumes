/**
 * Shared state shapes for Server Actions.
 *
 * These live outside the `'use server'` modules on purpose: a file marked
 * `'use server'` may only export async functions. Exporting a plain object from
 * one turns it into a server reference, and it arrives as `undefined` on the
 * client — which is exactly the kind of bug that only shows up at runtime.
 */

export type FormStatus = 'idle' | 'success' | 'error';

// --- Newsletter -----------------------------------------------------------

export type NewsletterState = {
  status: FormStatus;
  messageHe: string;
  errors: Record<string, string>;
};

export const NEWSLETTER_INITIAL: NewsletterState = {
  status: 'idle',
  messageHe: '',
  errors: {},
};

// --- Cart -----------------------------------------------------------------

export type CartActionState = {
  status: FormStatus;
  messageHe: string;
};

export const CART_ACTION_INITIAL: CartActionState = { status: 'idle', messageHe: '' };

// --- Wishlist -------------------------------------------------------------

export type WishlistState = {
  status: 'idle' | 'added' | 'removed' | 'error';
  messageHe: string;
  requiresLogin?: boolean;
};

export const WISHLIST_INITIAL: WishlistState = { status: 'idle', messageHe: '' };

// --- Auth -----------------------------------------------------------------

export type AuthState = {
  status: FormStatus;
  messageHe: string;
  errors: Record<string, string>;
};

export const AUTH_INITIAL: AuthState = { status: 'idle', messageHe: '', errors: {} };

// --- Checkout -------------------------------------------------------------

export type CheckoutState = {
  status: FormStatus;
  messageHe: string;
  errors: Record<string, string>;
  orderNumber?: string;
};

export const CHECKOUT_INITIAL: CheckoutState = {
  status: 'idle',
  messageHe: '',
  errors: {},
};

// --- Generic admin mutation ----------------------------------------------

export type AdminActionState = {
  status: FormStatus;
  messageHe: string;
  errors: Record<string, string>;
};

export const ADMIN_ACTION_INITIAL: AdminActionState = {
  status: 'idle',
  messageHe: '',
  errors: {},
};
