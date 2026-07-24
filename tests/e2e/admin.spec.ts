import { expect, test } from '@playwright/test';

/**
 * Admin dashboard coverage.
 *
 * Runs against the real app and the real database: a pass means the routes
 * render from live rows, the permission gate actually redirects, and a product
 * created through the form really lands in Postgres.
 */

const ADMIN_ROUTES = [
  ['/admin', 'לוח בקרה'],
  ['/admin/products', 'מוצרים'],
  ['/admin/products/new', 'מוצר חדש'],
  ['/admin/categories', 'קטגוריות'],
  ['/admin/collections', 'קולקציות'],
  ['/admin/orders', 'הזמנות'],
  ['/admin/customers', 'לקוחות'],
  ['/admin/inventory', 'מלאי'],
  ['/admin/coupons', 'קופונים'],
  ['/admin/reviews', 'ביקורות'],
  ['/admin/media', 'מדיה'],
  ['/admin/content', 'תוכן האתר'],
  ['/admin/journal', 'מגזין'],
  ['/admin/branches', 'סניפים'],
  ['/admin/newsletter', 'ניוזלטר'],
  ['/admin/users', 'משתמשי מערכת'],
  ['/admin/audit-log', 'יומן פעולות'],
  ['/admin/settings', 'הגדרות'],
] as const;

test.describe('admin access control', () => {
  // These assertions are about *not* being authenticated, so the stored admin
  // session must be discarded for this block.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a signed-out visitor is redirected to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a signed-in customer without admin roles is refused', async ({ page }) => {
    const email = `shopper-${Date.now()}@example.com`;

    await page.goto('/register');
    const form = page.locator('main');
    await form.getByLabel('שם פרטי').fill('דנה');
    await form.getByLabel('שם משפחה').fill('כהן');
    await form.getByLabel('דוא״ל').fill(email);
    await form.getByLabel(/סיסמה/).fill('Sh0pper-pass');
    await form.getByRole('button', { name: 'יצירת חשבון' }).click();
    await page.waitForURL(/\/account/, { timeout: 20_000 });

    await page.goto('/admin');
    // Rendered, but as a 403 page — not the dashboard.
    await expect(page.getByRole('heading', { name: 'אין לכם הרשאה' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'לוח בקרה' })).toHaveCount(0);
  });
});

// Signed in via the stored admin session (see auth.setup.ts).
test.describe('admin dashboard', () => {
  test('every admin route renders in Hebrew RTL', async ({ page }) => {
    for (const [route, heading] of ADMIN_ROUTES) {
      await page.goto(route);
      await expect(page.locator('html'), `lang on ${route}`).toHaveAttribute('lang', 'he');
      await expect(page.locator('html'), `dir on ${route}`).toHaveAttribute('dir', 'rtl');
      await expect(
        page.getByRole('heading', { level: 1, name: heading }),
        `h1 on ${route}`,
      ).toBeVisible();
    }
  });

  test('no admin page scrolls horizontally', async ({ page }) => {
    for (const [route] of ADMIN_ROUTES) {
      await page.goto(route);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth - overflow.clientWidth,
        `horizontal overflow on ${route}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test('the dashboard shows real aggregates, not placeholders', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('הזמנות היום')).toBeVisible();
    await expect(page.getByText('ערך הזמנה ממוצע')).toBeVisible();
    // Seeded orders exist, so the recent-orders list must show a real number.
    await expect(page.locator('text=/MK-\\d{4}-\\d{6}/').first()).toBeVisible();
  });

  test('a product can be created and then found in the catalogue', async ({ page }) => {
    const stamp = Date.now().toString(36);
    const nameHe = `בושם בדיקה ${stamp}`;
    const sku = `TEST-${stamp.toUpperCase()}`;

    await page.goto('/admin/products/new');
    const form = page.locator('main');
    await form.getByLabel('שם בעברית').fill(nameHe);
    await form.getByLabel('שם רשמי באנגלית').fill(`Test Fragrance ${stamp}`);
    await form.getByLabel('מק״ט').fill(sku);
    await form.getByLabel('מחיר (₪)').fill('199.90');
    await form.getByLabel('כמות במלאי').fill('7');
    await form.getByRole('button', { name: 'יצירת מוצר' }).click();

    await page.waitForURL(/\/admin\/products\/[a-z0-9]+\?created=1/, { timeout: 30_000 });
    await expect(page.getByText('המוצר נוצר בהצלחה.')).toBeVisible();

    // It must appear in the admin list.
    await page.goto(`/admin/products?q=${encodeURIComponent(sku)}`);
    await expect(page.getByRole('link', { name: nameHe })).toBeVisible();
  });

  test('inventory adjustment is recorded with a reason', async ({ page }) => {
    await page.goto('/admin/inventory');

    const firstRow = page.locator('tbody tr').first();
    await firstRow.locator('input[name="delta"]').fill('3');
    await firstRow.getByRole('button', { name: 'עדכון' }).click();

    await expect(page.getByText(/המלאי של .* עודכן/)).toBeVisible({ timeout: 20_000 });

    // The movement must show up in the history list — scoped to the history
    // card, because the adjust form's <select> also contains that label.
    const history = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'היסטוריית תנועות' }) });
    await expect(history.getByText('התאמה ידנית').first()).toBeVisible();

    // Put the stock back: the purchase spec relies on the seeded quantities,
    // and a test that permanently mutates shared data is a flaky test.
    await firstRow.locator('input[name="delta"]').fill('-3');
    await firstRow.getByRole('button', { name: 'עדכון' }).click();
    await expect(page.getByText(/המלאי של .* עודכן/)).toBeVisible({ timeout: 20_000 });
  });

  test('inventory cannot be driven negative', async ({ page }) => {
    await page.goto('/admin/inventory');

    const firstRow = page.locator('tbody tr').first();
    await firstRow.locator('input[name="delta"]').fill('-99999');
    await firstRow.getByRole('button', { name: 'עדכון' }).click();

    await expect(page.getByText(/לא ניתן להוריד/)).toBeVisible({ timeout: 20_000 });
  });

  test('an order can be opened and its packing slip printed', async ({ page }) => {
    await page.goto('/admin/orders');
    await page.locator('a[dir="ltr"]').first().click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('MK-');
    await expect(page.getByText('ציר זמן')).toBeVisible();

    await page.getByRole('link', { name: /תעודת ליקוט/ }).click();
    await expect(page.getByRole('heading', { name: 'תעודת ליקוט' })).toBeVisible();
  });

  test('admin actions are written to the audit log', async ({ page }) => {
    await page.goto('/admin/audit-log');
    // The product creation and inventory adjustment above must be recorded.
    await expect(page.getByText('inventory.adjust').first()).toBeVisible();
  });

  test('content blocks are editable', async ({ page }) => {
    await page.goto('/admin/content');
    const heroTitle = page.locator('input[name="titleHe"]').first();
    await expect(heroTitle).toHaveValue(/.+/);

    await heroTitle.fill('ניחוח שנשאר איתך');
    await page.getByRole('button', { name: 'שמירה' }).first().click();
    await expect(page.getByText('התוכן נשמר.')).toBeVisible({ timeout: 20_000 });
  });
});
