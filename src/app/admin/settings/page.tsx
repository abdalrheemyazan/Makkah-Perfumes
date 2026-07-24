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

const SETTING_LABELS: Record<string, string> = {
  'store.name': 'שם החנות',
  'store.legalEntity': 'ישות משפטית (ח.פ. / ע.מ.)',
  'store.phone': 'טלפון שירות',
  'store.email': 'דוא״ל שירות',
};

export default async function AdminSettingsPage() {
  await requireCapability('settings.write');

  const settings = await db.siteSetting.findMany({ orderBy: { key: 'asc' } });
  const editable = settings.filter((setting) => setting.key in SETTING_LABELS);
  const devPayment = isDevelopmentPaymentMode();

  return (
    <div>
      <PageHeader
        titleHe="הגדרות"
        descriptionHe="הגדרות החנות ומצב האינטגרציות. שדות ריקים מציינים מידע שטרם התקבל מהמותג."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card titleHe="פרטי החנות">
          <div className="flex flex-col gap-5">
            {editable.map((setting) => (
              <SiteSettingForm
                key={setting.key}
                settingKey={setting.key}
                labelHe={SETTING_LABELS[setting.key]!}
                value={setting.value}
              />
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card titleHe="מצב אינטגרציות">
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
                      <span className="text-success">SMTP</span>
                    ),
                },
                {
                  labelHe: 'הגבלת קצב',
                  value:
                    (process.env.RATE_LIMIT_DRIVER ?? 'memory') === 'memory' ? (
                      <span className="text-warning">בזיכרון (אינסטנס יחיד)</span>
                    ) : (
                      <span className="text-success">Redis</span>
                    ),
                },
              ]}
            />
            <p className="mt-4 text-xs leading-relaxed text-faint">
              חיבור ספקים אמיתיים מתועד ב־<span dir="ltr">docs/DEPLOYMENT.md</span>.
            </p>
          </Card>

          <Card titleHe="משלוח" descriptionHe="תעריפי פיתוח — טרם אומתו מול המותג">
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
                תעריפים אלה הם ערכי פיתוח המוגדרים בקוד
                (<span dir="ltr">src/lib/commerce/pricing.ts</span>) ואינם ניתנים לעריכה
                מכאן בכוונה — יש להחליף אותם בתעריפים מאושרים לפני עלייה לייצור.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
