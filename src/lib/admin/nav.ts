import type { Capability } from '@/lib/auth';

/**
 * Admin navigation.
 *
 * Each entry declares the capability required to see it, so the sidebar shows a
 * Support Agent a different menu than a Super Admin. This is presentation only —
 * every route and every mutation re-checks server-side. Hiding a link is not
 * access control.
 */

export type AdminNavItem = {
  href: string;
  labelHe: string;
  capability: Capability;
};

export type AdminNavGroup = {
  titleHe: string;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    titleHe: 'סקירה',
    items: [{ href: '/admin', labelHe: 'לוח בקרה', capability: 'orders.read' }],
  },
  {
    titleHe: 'קטלוג',
    items: [
      { href: '/admin/products', labelHe: 'מוצרים', capability: 'products.write' },
      { href: '/admin/categories', labelHe: 'קטגוריות', capability: 'products.write' },
      { href: '/admin/collections', labelHe: 'קולקציות', capability: 'products.write' },
      { href: '/admin/inventory', labelHe: 'מלאי', capability: 'inventory.write' },
    ],
  },
  {
    titleHe: 'מכירות',
    items: [
      { href: '/admin/orders', labelHe: 'הזמנות', capability: 'orders.read' },
      { href: '/admin/customers', labelHe: 'לקוחות', capability: 'customers.read' },
      { href: '/admin/coupons', labelHe: 'קופונים', capability: 'coupons.write' },
    ],
  },
  {
    titleHe: 'תוכן',
    items: [
      { href: '/admin/content', labelHe: 'תוכן האתר', capability: 'content.write' },
      { href: '/admin/media', labelHe: 'מדיה', capability: 'content.write' },
      { href: '/admin/journal', labelHe: 'מגזין', capability: 'content.write' },
      { href: '/admin/branches', labelHe: 'סניפים', capability: 'content.write' },
      { href: '/admin/reviews', labelHe: 'ביקורות', capability: 'reviews.moderate' },
      { href: '/admin/newsletter', labelHe: 'ניוזלטר', capability: 'content.write' },
    ],
  },
  {
    titleHe: 'מערכת',
    items: [
      { href: '/admin/users', labelHe: 'משתמשי מערכת', capability: 'users.write' },
      { href: '/admin/audit-log', labelHe: 'יומן פעולות', capability: 'audit.read' },
      { href: '/admin/settings', labelHe: 'הגדרות', capability: 'settings.write' },
    ],
  },
] as const;
