import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('retired public sections', () => {
  const site = read('src/lib/site.ts');
  const home = read('src/app/(site)/page.tsx');
  const footer = read('src/components/layout/site-footer.tsx');
  const sitemap = read('src/app/sitemap.ts');

  it('has no branches link in shared desktop, mobile, footer or homepage sources', () => {
    for (const source of [site, home, footer]) {
      expect(source).not.toContain("href: '/stores'");
      expect(source).not.toContain('סניפים');
    }
    expect(sitemap).not.toContain('/stores');
  });

  it('has no magazine link or public journal sitemap query', () => {
    for (const source of [site, home, footer, sitemap]) {
      expect(source).not.toContain("href: '/journal'");
      expect(source).not.toContain('מגזין');
    }
    expect(sitemap).not.toContain('journalPost');
  });

  it('permanently redirects old URLs', () => {
    expect(read('src/app/(site)/stores/page.tsx')).toContain("permanentRedirect('/contact')");
    expect(read('src/app/(site)/journal/page.tsx')).toContain("permanentRedirect('/about')");
    expect(read('src/app/(site)/journal/[slug]/page.tsx')).toContain("permanentRedirect('/about')");
  });
});

describe('polished public information pages', () => {
  const publicPages = [
    'src/app/(site)/about/page.tsx',
    'src/app/(site)/shipping-and-returns/page.tsx',
    'src/app/(site)/privacy/page.tsx',
    'src/app/(site)/cookies/page.tsx',
    'src/app/(site)/terms/page.tsx',
    'src/app/(site)/contact/page.tsx',
  ].map(read).join('\n');

  it('contains no missing-business warnings or placeholder warning copy', () => {
    expect(publicPages).not.toContain('MISSING_BUSINESS_DATA');
    expect(publicPages).not.toContain('התוכן המשפטי טרם התקבל');
    expect(publicPages).not.toContain('סיפור המותג המלא טרם אושר');
    expect(publicPages).not.toContain('פרטי יצירת קשר טרם התקבלו');
  });

  it('publishes the approved 1976 Oman brand story and all four values', () => {
    const about = read('src/app/(site)/about/page.tsx');
    expect(about).toContain('המסע של');
    expect(about).toContain('החל בשנת 1976');
    expect(about).toContain('בסולטנות עומאן');
    for (const value of ['מורשת', 'יצירה', 'איכות', 'חוויית לקוח']) expect(about).toContain(value);
  });

  it('shows all three real delivery methods and prices from shared constants', () => {
    const shipping = read('src/app/(site)/shipping-and-returns/page.tsx');
    for (const method of ['איסוף עצמי', 'משלוח רגיל', 'משלוח מהיר']) expect(shipping).toContain(method);
    expect(shipping).toContain('SHIPPING_PRICES.REGULAR');
    expect(shipping).toContain('SHIPPING_PRICES.EXPRESS');
    expect(shipping).not.toMatch(/2[–-]5|ימי עסקים/);
  });

  it('uses actual privacy, cookie and no-card-payment behavior', () => {
    const privacy = read('src/app/(site)/privacy/page.tsx');
    const cookies = read('src/app/(site)/cookies/page.tsx');
    const terms = read('src/app/(site)/terms/page.tsx');
    expect(privacy).toContain('מידע טכני שנאסף בעת השימוש');
    expect(privacy).toContain('כתובת IP');
    for (const key of ['makkah_session', 'makkah_cart', 'makkah-a11y', 'makkah-pwa-installed']) expect(cookies).toContain(key);
    expect(cookies).toContain('אינו מפעיל עוגיות פרסום');
    expect(terms).toContain('אין באתר תשלום מקוון בכרטיס');
    expect(terms).toContain('שליחת הזמנה היא בקשת הזמנה');
    expect(terms).toContain('הוספת מוצר לסל אינה שומרת מלאי');
  });
});

describe('checkout presentation', () => {
  const page = read('src/app/(site)/checkout/page.tsx');
  const form = read('src/components/checkout/checkout-form.tsx');

  it('uses the desktop two-column layout and sticky summary', () => {
    expect(page).toContain('השלמת הזמנה');
    expect(form).toContain('lg:grid-cols-[minmax(0,1.85fr)_minmax(20rem,1fr)]');
    expect(form).toContain('lg:sticky lg:top-28');
    expect(form).toContain('סיכום ההזמנה');
  });

  it('keeps one shipping state and removes the empty payment step', () => {
    expect(form).toContain("useState<ShippingMethod>('SELF_PICKUP')");
    expect(form).not.toContain('titleHe="תשלום"');
    expect(form).toContain('פרטי התשלום והמסירה יתואמו לאחר אישור ההזמנה');
    expect(form).toContain("pending ? 'ההזמנה נשלחת...' : 'אישור הזמנה'");
  });
});
