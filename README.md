# MAKKAH PERFUMES — חנות הדגל הדיגיטלית

חנות מסחר אלקטרוני בעברית מלאה (RTL) לבית הבשמים MAKKAH PERFUMES.
Next.js App Router · TypeScript strict · PostgreSQL · Prisma · Tailwind v4.

> **סטטוס:** ליבת המסחר פועלת מקצה לקצה מול בסיס נתונים אמיתי.
> האתר **אינו מוכן לייצור** עד שיתקבלו מחירים, מלאי, ספק סליקה ופרטי ישות
> משפטית. ראו [`docs/MISSING_BUSINESS_DATA.md`](docs/MISSING_BUSINESS_DATA.md).

---

## הפעלה מקומית

דרישות: Node.js 20+ (נבדק על 24), npm.
**אין צורך ב-Docker או בהתקנת PostgreSQL** — הפרויקט מריץ בינארי PostgreSQL מוטמע.

```bash
npm install
cp .env.example .env
npm run db:server        # טרמינל 1 — PostgreSQL על פורט 55432
npx prisma migrate deploy
npm run db:seed
npm run dev              # טרמינל 2 — http://localhost:3000
```

חשבון ניהול שנוצר בזריעה: `admin@makkah.local` / `Admin123!makkah`
(ניתן לשינוי דרך `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

---

## פקודות

| פקודה | תיאור |
|---|---|
| `npm run dev` | שרת פיתוח |
| `npm run build` | בניית ייצור |
| `npm start` | הרצת שרת ייצור |
| `npm run typecheck` | בדיקת טיפוסים |
| `npm run lint` | ESLint |
| `npm test` | בדיקות יחידה (Vitest) |
| `npx playwright test` | בדיקות דפדפן (דסקטופ + מובייל) |
| `npm run db:server` | PostgreSQL מקומי מוטמע |
| `npm run db:migrate` | יצירת מיגרציה חדשה |
| `npm run db:seed` | זריעת נתוני פיתוח |
| `npm run db:studio` | Prisma Studio |

---

## ארכיטקטורה

```
src/
  app/
    (site)/          עמודי החנות הציבוריים
    actions/         Server Actions (cart, checkout, auth, wishlist, newsletter)
  components/        רכיבי ממשק
  lib/
    commerce/
      money.ts       חשבון כספי באגורות בלבד
      pricing.ts     חישוב עגלה, קופונים, משלוח
      cart.ts        עגלה בצד שרת (server-only)
      orders.ts      יצירת הזמנה טרנזקציונית
      payment.ts     מתאם ספק סליקה
      labels.ts      תוויות עברית משותפות (client-safe)
    auth.ts          סשנים, תפקידים, יכולות
    db.ts            Prisma client יחיד
  generated/prisma/  קליינט Prisma (נוצר אוטומטית)
prisma/              סכמה, מיגרציות, זריעה
tests/unit           Vitest
tests/e2e            Playwright
docs/                תיעוד הפרויקט
```

**עקרונות:**
- Server Components כברירת מחדל. Client Components רק לאינטראקציה.
- כל סכום כסף הוא מספר שלם באגורות. לעולם לא float.
- מחירים ומלאי מחושבים מחדש בשרת לפני כתיבת הזמנה.
- יצירת הזמנה, שריון מלאי ומימוש קופון — בטרנזקציה אחת.
- מפתח אידמפוטנטיות מונע הזמנה כפולה.

---

## נכסי מותג

| תיקייה | תוכן |
|---|---|
| `assets/original-brand-reference/` | עותק מקורי, בייט-לבייט. **לא לעריכה** |
| `public/brand-reference/products/` | 13 מוצרים × AVIF/WebP/PNG |
| `public/brand-reference/logo/` | לוגו רשמי |
| `public/generated/` | נכסים שנוצרו (ריק כרגע) |

פירוט מלא: [`docs/ASSET_MANIFEST.md`](docs/ASSET_MANIFEST.md).

---

## תיעוד

| מסמך | נושא |
|---|---|
| [CLAUDE.md](CLAUDE.md) | כללי עבודה בקוד |
| [docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md) | מה אומת מכל תצלום מוצר |
| [docs/MISSING_BUSINESS_DATA.md](docs/MISSING_BUSINESS_DATA.md) | מה חסר לפני ייצור |
| [docs/TESTING.md](docs/TESTING.md) | מה נבדק ומה לא |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | חיבור סליקה, דואר וייצור |

---

## רישוי גופנים

Frank Ruhl Libre ו-Heebo מוגשים תחת SIL Open Font License דרך `next/font`,
ומאוחסנים מקומית בזמן בנייה — אין בקשת רשת ל-Google בזמן ריצה.
