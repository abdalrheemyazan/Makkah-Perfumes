# פריסה — Deployment

> **האתר אינו מוכן לייצור.** רשימת החוסמים ב-[MISSING_BUSINESS_DATA.md](./MISSING_BUSINESS_DATA.md).
> מסמך זה מתאר מה צריך לחבר כשהמידע יתקבל.

---

## 1. בסיס נתונים

הפיתוח משתמש ב-PostgreSQL מוטמע (`npm run db:server`) שנשמר תחת `.postgres-data/`.
**אין להשתמש בו בייצור.**

בייצור:

1. הקימו PostgreSQL מנוהל (Neon / Supabase / RDS / Cloud SQL).
2. הגדירו `DATABASE_URL`.
3. הריצו `npx prisma migrate deploy`.
4. **אל תריצו** `npm run db:seed` בייצור — הוא זורע נתוני פיתוח מסומנים.

הקידוד חייב להיות **UTF-8**. אשכול ב-WIN1252 לא יוכל לאחסן עברית כלל
(זו הייתה תקלה אמיתית בהקמה, ולכן `initdb` מקבל `--encoding=UTF8` במפורש).

---

## 2. ספק סליקה

כרגע פועל `DevelopmentPaymentProvider` בלבד: הוא מאשר כל הזמנה, אינו מחייב,
ואינו מציג טופס כרטיס אשראי. הזמנות שהוא יוצר מסומנות `isDevelopmentOrder = true`
ומוצגות עם אזהרה כתומה בממשק הלקוח ובאישור ההזמנה.

### חיבור ספק אמיתי

1. ממשו את הממשק `PaymentProvider` מתוך `src/lib/commerce/payment.ts`:
   ```ts
   // src/lib/commerce/providers/tranzila.ts
   export class TranzilaProvider implements PaymentProvider {
     readonly id = 'tranzila';
     readonly isLive = true;
     async authorize(intent: PaymentIntent): Promise<PaymentResult> { /* … */ }
     async refund(reference: string, amountAgorot: number): Promise<PaymentResult> { /* … */ }
   }
   ```
2. רשמו אותו ב-`getPaymentProvider()`.
3. הגדירו `PAYMENT_PROVIDER=tranzila` ואת מפתחות ה-API.

`getPaymentProvider()` **זורק שגיאה** על ערך לא ממומש, במכוון — עדיף כישלון רועש
מאשר קבלת הזמנות שלעולם לא ייגבו.

### כללי אבטחת תשלום

- פרטי כרטיס חייבים לעבור **ישירות מהדפדפן לספק** (iframe / hosted fields / tokenization).
  הם לא נוגעים בשרת הזה. אין ולא יהיה שדה `cardNumber` בסכמה.
- אמתו webhooks בחתימה (`PAYMENT_WEBHOOK_SECRET`).
- טיפול ב-webhook חייב להיות אידמפוטנטי — ספקים שולחים כפילויות.

---

## 3. דואר טרנזקציוני

ברירת המחדל `MAIL_TRANSPORT=console` מדפיסה את ההודעה ללוג במקום לשלוח.
לחיבור אמיתי: הוסיפו transport ב-`src/lib/mail.ts` והגדירו `MAIL_TRANSPORT=smtp`
ואת משתני `SMTP_*`.

כשל בשליחת דואר **אינו** מבטל הזמנה — הוא נרשם ללוג בלבד. הזמנה ששולמה לא תאבד
בגלל שרת דואר.

---

## 4. משתני סביבה בייצור

| משתנה | חובה | הערה |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL מנוהל, UTF-8 |
| `AUTH_SECRET` | ✅ | 32 תווים לפחות. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | דומיין מלא עם `https://` — משמש ל-canonical, sitemap ו-OG |
| `PAYMENT_PROVIDER` | ✅ | חייב להיות ספק אמיתי |
| `MAIL_TRANSPORT` | ✅ | `smtp` |
| `RATE_LIMIT_DRIVER` | ⚠️ | `memory` תקין רק לאינסטנס יחיד. במספר אינסטנסים נדרש `redis` + `REDIS_URL` |

---

## 5. לפני העלייה — רשימת בדיקה

- [ ] כל הפריטים ב-[MISSING_BUSINESS_DATA.md](./MISSING_BUSINESS_DATA.md) §1 הושלמו
- [ ] `pricingVerified = true` לכל המוצרים, ותג ״מחיר לדוגמה״ נעלם
- [ ] מלאי אמיתי ומק״טים רשמיים הוזנו
- [ ] ספק סליקה מחובר ונבדק בסביבת sandbox
- [ ] עמודי מדיניות אושרו משפטית
- [ ] פרטי רכז נגישות פורסמו (תקן ישראלי 5568)
- [ ] `AUTH_SECRET` הוחלף במפתח אקראי
- [ ] `RATE_LIMIT_DRIVER=redis` אם רצים ביותר מאינסטנס אחד
- [ ] גיבוי אוטומטי לבסיס הנתונים מוגדר
- [ ] `npm run build` עובר
- [ ] `npx playwright test` עובר מול בניית ייצור

---

## 6. פערי אבטחה שטרם נסגרו

יש לטפל בהם לפני ייצור:

- **Content Security Policy** — טרם הוגדר. יש להוסיף headers ב-`next.config.ts`.
- **HSTS ו-security headers** — טרם הוגדרו.
- **סיבוב סשנים** — הסשן אינו מתחדש לאחר שינוי סיסמה.
- **אימות כתובת דוא״ל** — השדה `emailVerified` קיים בסכמה אך אין זרימת אימות.
- **מחיקת חשבון** — `deletionRequestedAt` קיים אך אין תהליך מימוש.
- **CAPTCHA** — טפסים ציבוריים מוגנים בהגבלת קצב בלבד.
