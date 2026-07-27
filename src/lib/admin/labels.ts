/**
 * Hebrew labels for admin-facing enums.
 * No server imports — used by both Server and Client Components.
 */

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'מנהל־על',
  ADMIN: 'מנהל',
  CONTENT_MANAGER: 'מנהל תוכן',
  ORDER_MANAGER: 'מנהל הזמנות',
  INVENTORY_MANAGER: 'מנהל מלאי',
  SUPPORT_AGENT: 'נציג שירות',
  CUSTOMER: 'לקוח',
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'טיוטה',
  PUBLISHED: 'מפורסם',
  ARCHIVED: 'בארכיון',
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: 'ממתינה לאישור',
  APPROVED: 'מאושרת',
  REJECTED: 'נדחתה',
};

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'אחוז הנחה',
  FIXED_AMOUNT: 'סכום קבוע',
  FREE_SHIPPING: 'משלוח חינם',
};

export const MOVEMENT_REASON_LABELS: Record<string, string> = {
  INITIAL_STOCK: 'מלאי התחלתי',
  MANUAL_ADJUSTMENT: 'התאמה ידנית',
  ORDER_RESERVED: 'שוריין להזמנה',
  ORDER_RELEASED: 'שוחרר מהזמנה',
  ORDER_FULFILLED: 'סופק להזמנה',
  RETURN_RESTOCK: 'החזרה למלאי',
  DAMAGE_WRITE_OFF: 'מחיקה בגלל נזק',
};

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  NEW: 'חדשה',
  READ: 'נקראה',
  IN_PROGRESS: 'בטיפול',
  RESOLVED: 'טופלה',
  ARCHIVED: 'בארכיון',
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'ממתין',
  LABEL_CREATED: 'נוצרה תווית',
  IN_TRANSIT: 'בדרך',
  DELIVERED: 'נמסר',
  FAILED: 'נכשל',
  RETURNED: 'הוחזר',
};

export const NOTE_TIER_LABELS: Record<string, string> = {
  TOP: 'תווי פתיחה',
  HEART: 'תווי לב',
  BASE: 'תווי בסיס',
};

export const MEDIA_KIND_LABELS: Record<string, string> = {
  IMAGE: 'תמונה',
  VIDEO: 'וידאו',
  POSTER: 'פוסטר',
  MODEL_3D: 'מודל תלת־ממד',
};

export const CONTENT_BLOCK_KIND_LABELS: Record<string, string> = {
  HERO: 'כותרת ראשית',
  BRAND_STORY: 'סיפור המותג',
  BANNER: 'באנר',
  RICH_TEXT: 'טקסט',
  FAQ: 'שאלות נפוצות',
  POLICY: 'מדיניות',
};
