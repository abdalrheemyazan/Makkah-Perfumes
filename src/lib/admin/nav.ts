import type { Capability } from '@/lib/auth';

/**
 * Admin navigation — intentionally small.
 *
 * The admin manages the STORE, not the whole website. The visible menu is just
 * the store essentials; website-content tools (media, journal, branches,
 * newsletter, settings, users, audit log, …) are not surfaced here. Categories
 * and collections are secondary product tools shown as tabs inside the Products
 * area, not top-level sections.
 *
 * Each item declares the capability required to see it. This is presentation
 * only — every route and every mutation re-checks server-side. Hiding a link is
 * never access control.
 */

export type AdminNavItem = {
  href: string;
  labelHe: string;
  capability: Capability;
  /** Optional count badge (e.g. new contact requests), filled in by the layout. */
  badge?: number;
};

/** The complete visible sidebar, in order. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: '/admin', labelHe: 'לוח בקרה', capability: 'orders.read' },
  { href: '/admin/products', labelHe: 'מוצרים', capability: 'products.write' },
  { href: '/admin/orders', labelHe: 'הזמנות', capability: 'orders.read' },
  { href: '/admin/inventory', labelHe: 'מלאי', capability: 'inventory.write' },
  { href: '/admin/customers', labelHe: 'לקוחות', capability: 'customers.read' },
  { href: '/admin/coupons', labelHe: 'קופונים', capability: 'coupons.write' },
  { href: '/admin/contact-requests', labelHe: 'פניות', capability: 'messages.read' },
] as const;

/** Secondary product tools, rendered as tabs within the Products area. */
export const PRODUCT_TABS: readonly { href: string; labelHe: string }[] = [
  { href: '/admin/products', labelHe: 'מוצרים' },
  { href: '/admin/categories', labelHe: 'קטגוריות' },
  { href: '/admin/collections', labelHe: 'קולקציות' },
] as const;
