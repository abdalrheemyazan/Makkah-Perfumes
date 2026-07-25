/**
 * Site-wide constants and navigation.
 *
 * Anything here that would be a factual claim about the business (address,
 * phone, founding story) is deliberately left empty until the client supplies
 * it — see docs/MISSING_BUSINESS_DATA.md.
 */

export const SITE = {
  nameHe: 'מכה פרפיומס',
  nameEn: 'Makkah Perfumes',
  /** Printed on the official logo and product labels. Quoted, not asserted by us. */
  tagline: 'SINCE 1976',
  descriptionHe:
    'בשמי יוקרה, לבונה וקטורת. חנות הדגל הדיגיטלית הרשמית של מכה פרפיומס.',
  locale: 'he-IL',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
} as const;

export type NavItem = {
  href: string;
  labelHe: string;
};

export const MAIN_NAV: readonly NavItem[] = [
  { href: '/', labelHe: 'בית' },
  { href: '/shop', labelHe: 'בשמים' },
  { href: '/collections', labelHe: 'קולקציות' },
  { href: '/frankincense-and-incense', labelHe: 'קטורת ולבונה' },
  { href: '/fragrance-finder', labelHe: 'התאמת ניחוח' },
  { href: '/about', labelHe: 'הסיפור שלנו' },
  { href: '/stores', labelHe: 'סניפים' },
  { href: '/contact', labelHe: 'יצירת קשר' },
] as const;

export const FOOTER_NAV: readonly { titleHe: string; items: readonly NavItem[] }[] = [
  {
    titleHe: 'קנייה',
    items: [
      { href: '/shop', labelHe: 'כל הבשמים' },
      { href: '/collections', labelHe: 'קולקציות' },
      { href: '/fragrance-finder', labelHe: 'התאמת ניחוח' },
      { href: '/wishlist', labelHe: 'רשימת משאלות' },
    ],
  },
  {
    titleHe: 'שירות',
    items: [
      { href: '/contact', labelHe: 'יצירת קשר' },
      { href: '/shipping-and-returns', labelHe: 'משלוחים והחזרות' },
      { href: '/stores', labelHe: 'סניפים' },
      { href: '/account/orders', labelHe: 'מעקב הזמנות' },
    ],
  },
  {
    titleHe: 'מידע',
    items: [
      { href: '/about', labelHe: 'הסיפור שלנו' },
      { href: '/journal', labelHe: 'מגזין' },
      { href: '/frankincense-and-incense', labelHe: 'עולם הלבונה' },
    ],
  },
  {
    titleHe: 'מדיניות',
    items: [
      { href: '/privacy', labelHe: 'פרטיות' },
      { href: '/terms', labelHe: 'תנאי שימוש' },
      { href: '/accessibility', labelHe: 'הצהרת נגישות' },
      { href: '/cookies', labelHe: 'עוגיות' },
    ],
  },
] as const;

/** Sort options for the catalogue. Values appear in the URL, so keep them stable. */
export const SORT_OPTIONS = [
  { value: 'recommended', labelHe: 'מומלצים' },
  { value: 'newest', labelHe: 'החדשים ביותר' },
  { value: 'price-asc', labelHe: 'מחיר: מהנמוך לגבוה' },
  { value: 'price-desc', labelHe: 'מחיר: מהגבוה לנמוך' },
  { value: 'bestsellers', labelHe: 'הנמכרים ביותר' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];
