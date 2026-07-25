import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDevelopmentPaymentMode } from '@/lib/commerce/payment';
import {
  DEVELOPMENT_FREE_SHIPPING_THRESHOLD,
  DEVELOPMENT_SHIPPING_RATES,
  SHIPPING_RATES_VERIFIED,
} from '@/lib/commerce/pricing';
import { formatPrice } from '@/lib/commerce/money';
import { Card, DefinitionList, PageHeader } from '@/components/admin/ui';
import { SiteSettingForm } from '@/components/admin/site-setting-form';

export const metadata: Metadata = { title: 'הגדרות' };

type SettingSection = {
  id: string;
  titleHe: string;
  descriptionHe?: string;
  keys: { key: string; labelHe: string; isSecret?: boolean }[];
};

const SECTIONS: SettingSection[] = [
  {
    id: 'general',
    titleHe: 'הגדרות כלליות',
    descriptionHe: 'שם המותג, שפה ואזור זמן ברירת מחדל',
    keys: [
      { key: 'store.name', labelHe: 'שם החנות והמותג' },
      { key: 'store.defaultLocale', labelHe: 'שפת הממשק הראשית (he-IL)' },
      { key: 'store.timezone', labelHe: 'אזור זמן (Asia/Jerusalem)' },
    ],
  },
  {
    id: 'business',
    titleHe: 'פרטי העסק',
    descriptionHe: 'ישות משפטית, מספר ח.פ./ע.מ. וכתובת רשמית',
    keys: [
      { key: 'store.legalEntity', labelHe: 'שם הישות המשפטית' },
      { key: 'store.registrationNumber', labelHe: 'מספר ח.פ. / עוסק מורשה' },
      { key: 'store.address', labelHe: 'כתובת העסק הרשמית' },
    ],
  },
  {
    id: 'branding',
    titleHe: 'לוגו ומיתוג',
    descriptionHe: 'נתיבי לוגו, אייקונים וצבעי מיתוג ראשיים',
    keys: [
      { key: 'branding.logoUrl', labelHe: 'נתיב לוגו בהיר (/brand-reference/logo/logo-ivory.png)' },
      { key: 'branding.accentColor', labelHe: 'צבע הדגשה ראשי (#b38a52)' },
      { key: 'branding.faviconUrl', labelHe: 'נתיב פאביקון (/favicon.ico)' },
    ],
  },
  {
    id: 'contact',
    titleHe: 'יצירת קשר',
    descriptionHe: 'דוא״ל וטלפון לשירות לקוחות ושעות פעילות',
    keys: [
      { key: 'store.email', labelHe: 'דוא״ל שירות לקוחות' },
      { key: 'store.phone', labelHe: 'טלפון שירות ותמיכה' },
      { key: 'store.supportHours', labelHe: 'שעות מענה טלפוני' },
    ],
  },
  {
    id: 'shipping',
    titleHe: 'משלוחים',
    descriptionHe: 'גורמי שילוח, תעריפים וספי משלוח חינם',
    keys: [
      { key: 'shipping.defaultCarrier', labelHe: 'חברת שילוח ראשית' },
      { key: 'shipping.standardRateAgorot', labelHe: 'תעריף משלוח רגיל באגורות' },
      { key: 'shipping.freeThresholdAgorot', labelHe: 'סף משלוח חינם באגורות' },
    ],
  },
  {
    id: 'payments',
    titleHe: 'תשלומים',
    descriptionHe: 'ספק סליקה ומפתח API (מוצפנים ומוסתרים)',
    keys: [
      { key: 'payment.provider', labelHe: 'ספק סליקה פעיל' },
      { key: 'payment.apiKey', labelHe: 'מפתח API לסליקה (מוסתר)', isSecret: true },
      { key: 'payment.mode', labelHe: 'מצב סליקה (production / test)' },
    ],
  },
  {
    id: 'seo',
    titleHe: 'SEO ומטא-דאטה',
    descriptionHe: 'כותרת ברירת מחדל ותמונת שיתוף לרשתות',
    keys: [
      { key: 'seo.defaultTitle', labelHe: 'כותרת אתר ברירת מחדל' },
      { key: 'seo.defaultDescription', labelHe: 'תיאור מטא ראשי' },
      { key: 'seo.ogImageUrl', labelHe: 'נתיב תמונת Open Graph ראשית' },
    ],
  },
  {
    id: 'social',
    titleHe: 'רשתות חברתיות',
    descriptionHe: 'קישורים רשמיים לערוצי המותג',
    keys: [
      { key: 'social.instagram', labelHe: 'עמוד אינסטגרם רשמי' },
      { key: 'social.facebook', labelHe: 'עמוד פייסבוק רשמי' },
      { key: 'social.tiktok', labelHe: 'עמוד טיקטוק רשמי' },
    ],
  },
  {
    id: 'accessibility',
    titleHe: 'נגישות',
    descriptionHe: 'פרטי רכז הנגישות ועדכון הצהרת הנגישות',
    keys: [
      { key: 'a11y.officerName', labelHe: 'שם רכז/ת הנגישות' },
      { key: 'a11y.officerEmail', labelHe: 'דוא״ל לפניות נגישות' },
      { key: 'a11y.statementDate', labelHe: 'תאריך עדכון הצהרת הנגישות' },
    ],
  },
  {
    id: 'notifications',
    titleHe: 'התראות',
    descriptionHe: 'נמענים להתראות הזמנות חדשות ומלאי נמוך',
    keys: [
      { key: 'notifications.adminEmails', labelHe: 'דוא״ל לקבלת התראות הזמנה' },
      { key: 'notifications.lowStockAlerts', labelHe: 'התראת מלאי נמוך (כן/לא)' },
    ],
  },
  {
    id: 'security',
    titleHe: 'אבטחה',
    descriptionHe: 'מדיניות סשן, הגבלת קצב ויומן פעולות',
    keys: [
      { key: 'security.sessionExpiryHours', labelHe: 'תוקף סשן בשעות (24)' },
      { key: 'security.rateLimitDriver', labelHe: 'מנגנון הגבלת קצב' },
      { key: 'security.auditLogPolicy', labelHe: 'מדיניות שמירת יומן פעולות' },
    ],
  },
];

export default async function AdminSettingsPage() {
  await requireCapability('settings.write');

  const existingSettings = await db.siteSetting.findMany();
  const settingsMap = new Map(existingSettings.map((s) => [s.key, s.value]));

  const devPayment = isDevelopmentPaymentMode();

  return (
    <div className="pb-16">
      <PageHeader
        titleHe="הגדרות האתר והמערכת"
        descriptionHe="ניהול מרכזי לכל 11 מכלולי ההגדרות, המיתוג, הסליקה והאבטחה של החנות."
      />

      {/* Integration overview card */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card titleHe="מצב אינטגרציות מנוטר" descriptionHe="סטטוס חי של חיבורי השרת והספקים">
          <DefinitionList
            rows={[
              {
                labelHe: 'ספק סליקה',
                value: devPayment ? (
                  <span className="text-warning">מצב פיתוח — אין חיוב אמיתי</span>
                ) : (
                  <span className="text-success">ספק חי מחובר</span>
                ),
              },
              {
                labelHe: 'דואר טרנזקציוני',
                value:
                  (process.env.MAIL_TRANSPORT ?? 'console') === 'console' ? (
                    <span className="text-warning">מודפס ללוג בלבד</span>
                  ) : (
                    <span className="text-success">SMTP פעיל</span>
                  ),
              },
              {
                labelHe: 'הגבלת קצב',
                value:
                  (process.env.RATE_LIMIT_DRIVER ?? 'memory') === 'memory' ? (
                    <span className="text-warning">בזיכרון (Memory)</span>
                  ) : (
                    <span className="text-success">Redis</span>
                  ),
              },
            ]}
          />
        </Card>

        <Card titleHe="תעריפי משלוח" descriptionHe="תעריפים מוגדרים למשלוחים ואיסוף">
          <DefinitionList
            rows={[
              {
                labelHe: 'משלוח רגיל',
                value: formatPrice(DEVELOPMENT_SHIPPING_RATES.STANDARD_DELIVERY),
              },
              {
                labelHe: 'משלוח מהיר',
                value: formatPrice(DEVELOPMENT_SHIPPING_RATES.EXPRESS_DELIVERY),
              },
              { labelHe: 'איסוף עצמי', value: 'חינם' },
              {
                labelHe: 'סף למשלוח חינם',
                value: formatPrice(DEVELOPMENT_FREE_SHIPPING_THRESHOLD),
              },
            ]}
          />
          {!SHIPPING_RATES_VERIFIED && (
            <p className="mt-4 rounded-sm border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
              תעריפים אלה מנוהלים בקוד השרת (<span dir="ltr">pricing.ts</span>). להחלפת תעריפים יש להתאים את ערכי בסיס הנתונים מפתחות המשלוח.
            </p>
          )}
        </Card>
      </div>

      {/* 11 Organized Hebrew RTL Settings Sections */}
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.id} titleHe={section.titleHe} descriptionHe={section.descriptionHe}>
            <div className="flex flex-col gap-5 pt-2">
              {section.keys.map((item) => {
                const val = settingsMap.get(item.key) ?? '';
                const displayVal = item.isSecret && val ? '••••••••••••' : val;
                return (
                  <SiteSettingForm
                    key={item.key}
                    settingKey={item.key}
                    labelHe={item.labelHe}
                    value={displayVal}
                  />
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
