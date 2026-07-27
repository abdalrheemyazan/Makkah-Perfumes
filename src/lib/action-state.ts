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

// --- Contact --------------------------------------------------------------

export type ContactState = {
  status: FormStatus;
  messageHe: string;
  errors: Record<string, string>;
};

export const CONTACT_INITIAL: ContactState = { status: 'idle', messageHe: '', errors: {} };

// --- Cart -----------------------------------------------------------------

export type CartActionState = {
  status: FormStatus;
  messageHe: string;
  /** Server-authoritative total item quantity, for reconciling the badge. */
  itemCount?: number;
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

// --- Restock notifications ------------------------------------------------

export type RestockActionState = {
  status: 'idle' | 'success' | 'already' | 'error';
  messageHe: string;
  /** Which delivery method the confirmation should reference, for the UI. */
  channelsHe?: string;
};

export const RESTOCK_INITIAL: RestockActionState = { status: 'idle', messageHe: '' };

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
