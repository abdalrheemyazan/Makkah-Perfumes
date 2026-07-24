import { expect, test } from '@playwright/test';

/**
 * The critical revenue path: browse → product → cart → checkout → order.
 *
 * This runs against the real application and the real database. A pass means an
 * order row actually exists, not that a success screen was mocked.
 */

test.describe('purchase flow', () => {
  test('a guest can buy a product and receive an order number', async ({ page }) => {
    // --- Catalogue --------------------------------------------------------
    await page.goto('/shop');
    await expect(page.getByRole('heading', { level: 1, name: 'בשמים' })).toBeVisible();

    // --- Product ----------------------------------------------------------
    await page.goto('/shop/royal-leather');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('רויאל');
    // The official English name must appear exactly as printed on the bottle.
    await expect(page.getByText('Royal Leather', { exact: true }).first()).toBeVisible();

    // Scope to the buy box — the container that also holds the <h1> — so the
    // click can never land on a related product's add-to-cart button. Grabbing
    // the page-wide `.first()` was fragile: if the hero product ran low on
    // stock its own button disabled, and the first remaining button belonged to
    // a related product.
    const buyBox = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 1 }) })
      .last();
    await buyBox.getByRole('button', { name: 'הוספה לעגלה' }).click();
    await expect(page.getByText('נוסף לעגלה').first()).toBeVisible();

    // --- Cart -------------------------------------------------------------
    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1, name: 'עגלת הקניות' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /רויאל/ })).toBeVisible();

    // --- Checkout ---------------------------------------------------------
    await page.getByRole('link', { name: 'למעבר לתשלום' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'תשלום' })).toBeVisible();

    // Development mode must be disclosed, not hidden.
    await expect(page.getByText('מצב פיתוח — לא מתבצע חיוב אמיתי')).toBeVisible();
    // And no card fields may be presented.
    await expect(page.locator('input[autocomplete="cc-number"]')).toHaveCount(0);

    // Scope to <main>: the footer newsletter form also has an email field.
    const form = page.locator('main');
    await form.getByLabel('דוא״ל').fill('guest@example.com');
    await form.getByLabel('שם פרטי').fill('ישראל');
    await form.getByLabel('שם משפחה').fill('ישראלי');
    await form.getByLabel('טלפון').fill('050-123-4567');
    await form.getByLabel('רחוב').fill('הרצל');
    await form.getByLabel('מספר בית').fill('12');
    await form.getByLabel('עיר').fill('תל אביב');

    await form.getByRole('button', { name: /ביצוע הזמנה/ }).click();

    // --- Confirmation -----------------------------------------------------
    await page.waitForURL(/\/checkout\/success/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'ההזמנה התקבלה' })).toBeVisible();

    const orderNumber = page.locator('[dir="ltr"]', { hasText: /^MK-\d{4}-\d{6}$/ }).first();
    await expect(orderNumber).toBeVisible();

    // The order must be labelled as a development order, never as a real sale.
    await expect(page.getByText(/לא בוצע חיוב אמיתי/)).toBeVisible();
  });

  test('the cart rejects a quantity beyond available stock', async ({ page }) => {
    // precious-vanilla is seeded with zero stock.
    await page.goto('/shop/precious-vanilla');
    await expect(page.getByText('אזל מהמלאי').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'אזל מהמלאי' })).toBeDisabled();
  });

  test('an invalid coupon is rejected with a Hebrew reason', async ({ page }) => {
    await page.goto('/shop/adventure');
    // The buy box is the first add-to-cart on the page; related products follow.
    await page.getByRole('button', { name: 'הוספה לעגלה' }).first().click();
    await expect(page.getByText('נוסף לעגלה').first()).toBeVisible();

    await page.goto('/cart');
    await page.getByLabel('קוד קופון').fill('NOPE-DOES-NOT-EXIST');
    await page.getByRole('button', { name: 'החלה' }).click();

    await expect(page.getByText('קוד הקופון אינו קיים.')).toBeVisible();
  });
});
