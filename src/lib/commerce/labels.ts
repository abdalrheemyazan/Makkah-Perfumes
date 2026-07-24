/**
 * Hebrew labels for commerce enums.
 *
 * Deliberately free of any server import. Both Client and Server Components use
 * these, and pulling them from a `server-only` module would drag Prisma and the
 * `pg` driver into the browser bundle.
 */

export const CONCENTRATION_LABELS: Record<string, string> = {
  PARFUM: 'פרפיום',
  EAU_DE_PARFUM: 'או דה פרפיום',
  EAU_DE_TOILETTE: 'או דה טואלט',
  EAU_DE_COLOGNE: 'או דה קולון',
  ATTAR_OIL: 'שמן עיטור',
  INCENSE: 'קטורת',
  UNSPECIFIED: '',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'ממתינה',
  CONFIRMED: 'אושרה',
  PROCESSING: 'בהכנה',
  SHIPPED: 'נשלחה',
  DELIVERED: 'נמסרה',
  CANCELLED: 'בוטלה',
  REFUNDED: 'הוחזרה',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'ממתין לתשלום',
  AUTHORIZED: 'מאושר',
  PAID: 'שולם',
  FAILED: 'נכשל',
  REFUNDED: 'הוחזר',
  PARTIALLY_REFUNDED: 'הוחזר חלקית',
};

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  UNFULFILLED: 'טרם נשלח',
  PARTIALLY_FULFILLED: 'נשלח חלקית',
  FULFILLED: 'נשלח',
  RETURNED: 'הוחזר',
};

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  STANDARD_DELIVERY: 'משלוח רגיל',
  EXPRESS_DELIVERY: 'משלוח מהיר',
  STORE_PICKUP: 'איסוף עצמי מסניף',
};

/** Builds the variant label shown in cart and catalogue, e.g. "100 מ״ל · או דה פרפיום". */
export function variantLabel(volumeMl: number | null, concentration: string): string {
  const parts: string[] = [];
  if (volumeMl) parts.push(`${volumeMl} מ״ל`);
  const concentrationHe = CONCENTRATION_LABELS[concentration];
  if (concentrationHe) parts.push(concentrationHe);
  return parts.length > 0 ? parts.join(' · ') : 'יחידה';
}
