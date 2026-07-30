import type { Metadata } from 'next';
import { Bike, PackageCheck, ShoppingBag } from 'lucide-react';
import { PageIdentity } from '@/components/layout/page-identity';
import { ButtonLink } from '@/components/ui/button';
import { formatPrice } from '@/lib/commerce/money';
import { SHIPPING_PRICES } from '@/lib/commerce/pricing';

export const metadata: Metadata = { title: 'משלוחים והחזרות' };

export default function Page() {
  const methods = [
    {
      titleHe: 'איסוף עצמי',
      priceHe: 'ללא עלות',
      icon: ShoppingBag,
      lines: [
        'לאחר אישור ההזמנה ניצור קשר עם הלקוח לצורך תיאום האיסוף.',
        'אין צורך להזין כתובת בעת בחירה באיסוף עצמי.',
      ],
    },
    {
      titleHe: 'משלוח רגיל',
      priceHe: `עלות: ${formatPrice(SHIPPING_PRICES.REGULAR)}`,
      icon: PackageCheck,
      lines: ['נדרשת כתובת מלאה.', 'פרטי וזמן המסירה יתואמו לאחר אישור ההזמנה.'],
    },
    {
      titleHe: 'משלוח מהיר',
      priceHe: `עלות: ${formatPrice(SHIPPING_PRICES.EXPRESS)}`,
      icon: Bike,
      lines: [
        'נדרשת כתובת מלאה.',
        'זמינות המשלוח המהיר ופרטיו יאושרו לאחר קבלת ההזמנה.',
      ],
    },
  ];

  const details = [
    {
      titleHe: 'טיפול בהזמנה',
      bodyHe:
        'לאחר שליחת ההזמנה מתקבל מספר הזמנה ונשמרים המוצרים שנבחרו. ההזמנה נבדקת על ידי צוות החנות, ולאחר מכן ניצור קשר לצורך אישור סופי של פרטי המסירה והתשלום.',
    },
    {
      titleHe: 'ביטול או שינוי הזמנה',
      bodyHe:
        'לבקשת שינוי או ביטול יש לפנות אלינו בהקדם דרך עמוד יצירת הקשר ולצרף את מספר ההזמנה. בקשות ביטול והחזרה יטופלו בהתאם להוראות הדין החל ולמצב ההזמנה והמוצר.',
    },
    {
      titleHe: 'מוצר שגוי או פגום',
      bodyHe:
        'אם התקבל מוצר שונה מן המוצר שהוזמן, או אם התגלה פגם בעת המסירה, יש לפנות אלינו בהקדם ולצרף את מספר ההזמנה ותמונה ברורה. הפנייה תיבדק וניצור קשר להמשך טיפול.',
    },
    {
      titleHe: 'החזרת מוצר',
      bodyHe:
        'יש לשמור על המוצר, אריזתו וכל הפריטים שנמסרו עמו. הזכאות להחזרה, אופן ההחזרה ודמי הביטול, ככל שחלים, ייקבעו בהתאם לדין החל ולנסיבות העסקה.',
    },
  ];

  return (
    <>
      <PageIdentity
        titleHe="משלוחים, איסוף והחזרות"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'משלוחים, איסוף והחזרות' }]}
      />
      <div className="container-editorial pt-10 pb-24">
        <p className="max-w-3xl text-lg leading-[1.9] text-cream/85">
          אנו מציעים מספר אפשרויות לקבלת ההזמנה. אפשרות המסירה והעלות מוצגות
          בבירור בתהליך ההזמנה לפני האישור הסופי.
        </p>

        <ul className="mt-10 grid gap-5 lg:grid-cols-3">
          {methods.map(({ titleHe, priceHe, icon: Icon, lines }) => (
            <li key={titleHe} className="rounded-sm border border-gold/18 bg-charcoal/65 p-6">
              <div className="flex items-center justify-between gap-4">
                <Icon className="h-6 w-6 text-gold" aria-hidden="true" />
                <span className="ltr-nums text-sm text-gold">{priceHe}</span>
              </div>
              <h2 className="mt-6 text-xl text-ivory">{titleHe}</h2>
              <ul className="mt-4 flex list-disc flex-col gap-2 ps-5 text-sm leading-[1.8] text-cream/75">
                {lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-x-16 gap-y-10 border-t border-gold/15 pt-12 md:grid-cols-2">
          {details.map((detail) => (
            <section key={detail.titleHe}>
              <h2 className="text-xl text-ivory">{detail.titleHe}</h2>
              <p className="mt-3 text-sm leading-[1.9] text-cream/75">{detail.bodyHe}</p>
            </section>
          ))}
        </div>

        <section className="mt-16 flex flex-col items-start justify-between gap-6 rounded-sm border border-gold/20 bg-ink-raised p-7 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl text-ivory">צריכים עזרה עם הזמנה?</h2>
            <p className="mt-2 text-sm text-cream/70">צרפו את מספר ההזמנה כדי שנוכל לסייע במהירות.</p>
          </div>
          <ButtonLink href="/contact">ליצירת קשר</ButtonLink>
        </section>
      </div>
    </>
  );
}
