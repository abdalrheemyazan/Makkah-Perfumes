# פריסה ל-Netlify — Makkah Perfumes

מסמך זה מסביר כיצד לפרוס את האפליקציה ל-Netlify. האפליקציה היא **Next.js App
Router דינמית** (Server Components, Server Actions, Prisma, אימות, נתיבים
דינמיים) — **לא** אתר סטטי. אין להגדיר `output: 'export'` ב-`next.config`.

> ההסבר הזה אינו מפעיל פריסה אוטומטית ואינו רוכש מסד נתונים. הוא מתעד את השלבים
> שעליכם לבצע ב-Netlify.

---

## 1. סביבות — מקומי מול ייצור

| | פיתוח מקומי / כיתה | ייצור (Netlify) |
|---|---|---|
| מסד נתונים | PostgreSQL מוטמע (`npm run db:server`, פורט 55432) | PostgreSQL מנוהל |
| `DATABASE_URL` | localhost:55432 | מגיע מהגדרות הסביבה של Netlify |
| Prisma Studio | `npm run db:studio` | לא בשימוש בייצור |
| חשבון מנהל | `npm run admin:create` מקומי | פקודה חד-פעמית מול מסד הייצור |

ה-`provider` של Prisma הוא `postgresql` בשתי הסביבות — אותה סכימה ואותן מיגרציות.
אין תלות ב-SQLite, ב-Docker, בבינארי מסד נתונים בתוך המאגר, בפורט 55432 או בנתיב
Windows מקומי בעת פריסת ייצור.

## 2. מסד נתונים לייצור

בחרו אפשרות מנוהלת אחת (אל תריצו את המסד המוטמע בייצור):

- **Netlify Database** (Neon Postgres דרך Netlify), או
- **Prisma Postgres** המחובר ל-Netlify, או כל PostgreSQL מנוהל אחר.

העתיקו את מחרוזת החיבור אל משתנה הסביבה `DATABASE_URL` ב-Netlify.

## 3. משתני סביבה נדרשים ב-Netlify

הוגדרו לפי שימוש אמיתי בקוד (ראו `.env.example`). **לעולם אל תעלו סודות ל-git.**

| משתנה | חובה | תיאור |
|---|---|---|
| `DATABASE_URL` | כן | מחרוזת חיבור ל-PostgreSQL המנוהל |
| `NEXT_PUBLIC_SITE_URL` | כן | כתובת האתר החיה (למשל `https://makkah.netlify.app`) — canonical, sitemap, OG |
| `PAYMENT_PROVIDER` | כן | `development` ל-MVP (הזמנות נרשמות ללא חיוב) |
| `MAIL_TRANSPORT` | לא | `console` (ברירת מחדל). ל-SMTP אמיתי: `smtp` + `SMTP_HOST/PORT/USER/PASSWORD` + `MAIL_FROM` |
| `ADMIN_SEED_EMAIL` | חד-פעמי | דוא״ל מנהל להקמה חד-פעמית (ראו §5) |
| `ADMIN_SEED_PASSWORD` | חד-פעמי | סיסמת מנהל להקמה חד-פעמית — **סוד**, ב-Netlify UI בלבד |

**אין** משתנה `AUTH_SECRET` — אימות הסשנים משתמש באסימון אקראי הנשמר כ-hash במסד
הנתונים, כך שאין סוד אימות לשמור.

## 4. בנייה ב-Netlify

הקובץ [`netlify.toml`](../netlify.toml) כבר מוגדר:

- פקודת בנייה: `npm run build`.
- `postinstall` (ב-`package.json`) מריץ `prisma generate` מיד לאחר ההתקנה, כך
  שה-Prisma Client קיים לפני הקומפילציה. `prisma generate` אינו מתחבר למסד נתונים.
- התוסף הרשמי `@netlify/plugin-nextjs` משרת את הפלט הדינמי.
- המסד המוטמע המקומי **אינו** מופעל בבנייה (רק `npm run db:server` מפעיל אותו,
  והוא אינו חלק מפקודת הבנייה).

## 5. מיגרציות והקמת מנהל בייצור

מיגרציות רצות עם **`prisma migrate deploy`** (לעולם לא `prisma migrate dev`
בייצור, ולעולם לא `migrate reset` על נתוני ייצור). הריצו זאת כשלב פריסה מבוקר או
ידנית פעם אחת מול מסד הייצור:

```bash
# מול DATABASE_URL של הייצור
npx prisma migrate deploy
```

הקמת מנהל־על היא פקודה **חד-פעמית** שקוראת את הפרטים ממשתני סביבה מוגנים, מבצעת
hash לסיסמה, ואינה מדפיסה אותה:

```bash
ADMIN_SEED_EMAIL="you@example.com" ADMIN_SEED_PASSWORD="…" npm run admin:create
```

הפקודה אידמפוטנטית (אם המשתמש קיים — מאפסת סיסמה ומוודאת הרשאה, בלי כפילות). אין
להריץ seed מלא (`db:seed`) אוטומטית בכל בנייה, ואין לאתחל או לזרוע מחדש נתוני ייצור.

## 6. אימות לפני פריסה

```bash
npm run typecheck
npm run lint
npm test
npm run build     # דורש DATABASE_URL רק אם מסופק במכוון; לא מפעיל את המסד המוטמע
npx netlify build # אם Netlify CLI מותקן ומחובר
```

## 7. מה לא לעשות

- לא PWA, לא service workers, לא install banners.
- לא לשנות provider ל-SQLite.
- לא להעלות `.env`, `.env.local`, סודות מסד נתונים, או סיסמת מנהל.
- לא לרשום פריסה חיה כהושלמה ללא כתובת Netlify אמיתית שנפתחה בהצלחה.
