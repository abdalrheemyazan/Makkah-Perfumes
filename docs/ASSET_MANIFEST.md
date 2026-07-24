# מפרט נכסים — Asset Manifest

מסמך זה מתעד כל נכס ויזואלי בפרויקט, מקורו, ומה **אומת בפועל** מתוך הנכס עצמו.

> **כלל יסוד:** כל מה שמופיע בעמודה "אומת" נקרא ישירות מתוך תצלום המוצר הרשמי.
> כל דבר אחר — מחיר, מלאי, תווי ניחוח, רכיבים, עמידות — **אינו מאומת** ומסומן
> בבסיס הנתונים בדגל `isDevelopmentData`. ראו [MISSING_BUSINESS_DATA.md](./MISSING_BUSINESS_DATA.md).

---

## 1. מקור הנכסים

| פריט | ערך |
|---|---|
| מקור מקורי | `C:\Users\abdal\Desktop\Perfumes\brand-reference` (סופק על ידי הלקוח) |
| גיבוי בתוך הריפו | `assets/original-brand-reference/` — עותק בייט-לבייט, **לא לעריכה** |
| נכסים בשימוש האתר | `public/brand-reference/logo/`, `public/brand-reference/products/` |
| מידות מקור | כל 13 תצלומי המוצר: **750 × 1000 px**, AVIF עם ערוץ אלפא (רקע שקוף) |
| לוגו | `logo.webp`, 1478 × 1474 px |

### נגזרות שנוצרו

לכל מוצר נוצרו שלוש גרסאות באותה רזולוציה (750 × 1000):

| סיומת | שימוש |
|---|---|
| `.avif` | הגשה ראשית באתר (הקובץ המקורי, ללא שינוי) |
| `.webp` | גיבוי לדפדפנים ללא תמיכת AVIF |
| `.png` | קלט לכלי עיבוד וג'נרציה שאינם קוראים AVIF (למשל Higgsfield) |

הנגזרות נוצרות ומאומתות על ידי `scripts/build-brand-derivatives.mjs`, שנכשל אם
ערוץ האלפא אבד. **שקיפות נבדקה ואומתה בכל 13 המוצרים בשני הפורמטים.**
היסטוריית התקלה מתועדת ב-[GENERATION_LOG.md](./GENERATION_LOG.md) §1.1.

### גרסאות לוגו

| קובץ | תיאור |
|---|---|
| `logo.webp` | המקור כפי שסופק — ציור שחור על רקע לבן **אטום** |
| `logo-ivory.png` | חיתוך שקוף בגוון שנהב — לשימוש על הרקע הכהה |
| `logo-ink.png` | חיתוך שקוף כהה — למשטחים בהירים ולהדפסה |

הציור לא שורטט מחדש; רק הרקע הלבן הוסר. ראו [GENERATION_LOG.md](./GENERATION_LOG.md) §1.2.

---

## 2. נרמול שמות קבצים

| שם מקורי | שם מנורמל | הערה |
|---|---|---|
| `Adventure.avif` | `adventure` | |
| `Amber Icense.avif` | `amber-incense` | **תוקנה שגיאת כתיב בשם הקובץ בלבד.** התווית האמיתית על הבקבוק כתובה נכון: `Amber Incense` (אומת ויזואלית). |
| `Amour Touch.avif` | `amour-touch` | |
| `Atheel.avif` | `atheel` | |
| `Blossom Candy.avif` | `blossom-candy` | |
| `Courage.avif` | `courage` | |
| `Luban.avif` | `luban` | |
| `Luxe Rose.avif` | `luxe-rose` | |
| `Oud Embrace.avif` | `oud-embrace` | |
| `Precious Vanilla.avif` | `precious-vanilla` | |
| `Pure Essence.avif` | `pure-essence` | |
| `Royal Leather.avif` | `royal-leather` | |
| `Storm Blue.avif` | `storm-blue` | |

---

## 3. זהות מוצר — מה אומת מהתצלום

כל שורה נקראה ישירות מהתצלום. **אין לשנות** גיאומטריית בקבוק, פקק, צבע נוזל או טקסט תווית
בשום נכס שנוצר (generated).

| מוצר | תבנית בקבוק | פקק | צבע/גימור | טקסט מודפס שאומת |
|---|---|---|---|---|
| **Adventure** | פלקון מלבני שקוף, כתפיים חדות | זהב גלילי מדורג | זכוכית שקופה, נוזל שקוף | `MAKKAH` · `Adventure` · `1976` (תווית זהב) |
| **Amber Incense** | "לבנה רכה" מלבנית מעוגלת | זהב מחורץ (ribbed) | חום שיש/עור | מונוגרם · `Amber Incense` · `EAU DE PARFUM` · `100 ml` |
| **Amour Touch** | זהה ל־Amber Incense | זהב מחורץ | כחול שיש | מונוגרם · `Amour Touch` · `EAU DE PARFUM` · `100 ml` |
| **Atheel** | גליל מט (frosted) | זהב מחוספס (knurled) | מדרג טורקיז→ירוק | `MAKKAH` · `Atheel` |
| **Blossom Candy** | דקנטר מסותת יהלומים | זהב מעוטר | מדרג שחור→אדום | `MAKKAH` · `BLOSSOM CANDY` · שנה על התווית |
| **Courage** | מלבני מט, כתפיים רכות | זהב מחורץ רחב | תכלת | `COURAGE` · `VAPORISATEUR SPARY` · `MAKKAH` · `e100ml` · `3.4 FL.OZ` |
| **Luban** (اللبان) | מלבני, פינות מעוגלות | זהב מלבני | מדרג ירוק→זהב | `اللبان` · איור עץ לבונה · `100ML` |
| **Luxe Rose** | זהה ל־Amber Incense | זהב מחורץ | סגול שיש | מונוגרם · `Luxe Rose` · `EAU DE PARFUM` · `100 ml` |
| **Oud Embrace** | גליל קריסטל מסותת | זהב גדול בצורת כתר | ענבר→שקוף | מדליון זהב עגול: `MAKKAH` · `Oud Embrace` · `SINCE 1976` |
| **Precious Vanilla** | מלבני מעוגל, מט | כסף גלילי | שחור מט | `MAKKAH` · `PRECIOUS VANILLA` · `MAKKAH PERFUMES since 1976` |
| **Pure Essence** | זהה ל־Amber Incense | זהב מחורץ | טורקיז כהה שיש | מונוגרם · `Pure Essence` · `EAU DE PARFUM` · `100 ml` |
| **Royal Leather** | דקנטר מסותת יהלומים | זהב מעוטר | מדרג חום→ענבר | `MAKKAH` · `SINCE 1976` · `ROYAL LEATHER` |
| **Storm Blue** | פלקון מלבני שקוף, קצוות נייביים | זהב גלילי מדורג | זכוכית שקופה, קצה כחול כהה | `MAKKAH` · `Storm Blue` · `1976` |

### תבניות בקבוק משותפות

ארבעה מוצרים חולקים **תבנית זהה** (נבדלים רק בצבע ובטקסט): `Amber Incense`,
`Amour Touch`, `Luxe Rose`, `Pure Essence`.
שניים חולקים את תבנית הדקנטר המסותת: `Royal Leather`, `Blossom Candy`.
שניים חולקים את הפלקון המלבני השקוף: `Adventure`, `Storm Blue`.

יש לשמר את ההבחנות האלו בכל סצנה קולנועית — אין ליצור בקבוק "כללי".

---

## 4. עובדות מותג שאומתו

מתוך הלוגו ומתוויות המוצרים בלבד:

- שם המותג: **MAKKAH PERFUMES**
- טקסט על הלוגו: `SINCE 1976`
- מונוגרם: אות סטליזציה בתוך עיגול (מופיעה על רוב הבקבוקים בזהב)

**נפח וריכוז שאומתו מהתווית** (ורק אלה):

| מוצר | נפח | ריכוז |
|---|---|---|
| Amber Incense | 100 ml | Eau de Parfum |
| Amour Touch | 100 ml | Eau de Parfum |
| Luxe Rose | 100 ml | Eau de Parfum |
| Pure Essence | 100 ml | Eau de Parfum |
| Courage | 100 ml | לא צוין על התווית |
| Luban | 100 ml | לא צוין על התווית |

לשאר המוצרים **לא צוין נפח או ריכוז** על התווית הגלויה — ראו
[MISSING_PRODUCT_ASSETS.md](./MISSING_PRODUCT_ASSETS.md).

---

## 5. תיקיות נכסים שנוצרו

| נתיב | תוכן |
|---|---|
| `public/brand-reference/logo/` | לוגו רשמי (webp + png) |
| `public/brand-reference/products/` | 13 מוצרים × 3 פורמטים = 39 קבצים |
| `public/generated/cinematic/` | 4 סצנות קולנועיות (2048×1143 WebP) |
| `public/generated/mobile/` | 4 גרסאות דיוקן למובייל (1080×1350) |
| `public/generated/posters/` | פוסטר ה-hero (הרכבה) + גרסת מובייל |
| `public/generated/social/` | `og-home.jpg` (1200×630) |
| `public/generated/products/` | ריק — לא נוצרו סצנות מוצר נפרדות |
| `public/generated/textures/` | ריק — אין WebGL בזמן אמת כרגע |
| `public/models/` | ריק — ראו MISSING_PRODUCT_ASSETS |

### נכסים שנוצרו — מקור וזהות

| נכס | מקור | זהות מוצר |
|---|---|---|
| `hero-stage.webp` | Higgsfield, במה ריקה | אין מוצר בתמונה |
| `scene-frankincense.webp` | Higgsfield | אין מוצר |
| `scene-craft.webp` | Higgsfield | אין מוצר |
| `scene-incense.webp` | Higgsfield | אין מוצר |
| `hero-poster.webp` | **הרכבה** — במה שנוצרה + תצלום אמיתי | **התצלום המקורי, ללא שינוי** |

אף נכס שנוצר אינו מכיל בקבוק שצויר על ידי מודל. כל בקבוק הנראה באתר הוא
התצלום הרשמי של הלקוח. הסיבה לכך מתועדת ב-[GENERATION_LOG.md](./GENERATION_LOG.md) §2.4.

---

## 6. איסורים על נכסים שנוצרים

חל איסור מוחלט על נכס שנוצר להכיל:

- טקסט מכל סוג (במיוחד עברית)
- לוגו מומצא או שינוי הלוגו הרשמי
- שינוי צורת בקבוק, פקק, תווית או צבע נוזל
- כפילות מוצרים או בקבוקים מומצאים
- כתוביות, סימני מים, אודיו
- דימויים דתיים

כל נכס שנוצר נבדק מול הרשימה הזו לפני שילוב, והבדיקה מתועדת ב־[GENERATION_LOG.md](./GENERATION_LOG.md).
