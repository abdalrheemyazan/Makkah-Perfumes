import { expect, test } from '@playwright/test';

async function registerCustomer(page: import('@playwright/test').Page) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await page.goto('/register');
  const form = page.locator('main');
  await form.getByLabel('שם פרטי').fill('ישראל');
  await form.getByLabel('שם משפחה').fill('ישראלי');
  await form.getByRole('textbox', { name: 'דוא״ל', exact: true }).fill(`customer-${stamp}@example.com`);
  await form.getByLabel('סיסמה (לפחות 8 תווים, אות וספרה)').fill(`Makkah${stamp}!`);
  await form.getByRole('button', { name: 'יצירת חשבון' }).click();
  await page.waitForURL(/\/account$/);
}

/**
 * The critical revenue path: browse → product → cart → checkout → order.
 *
 * This runs against the real application and the real database. A pass means an
 * order row actually exists, not that a success screen was mocked.
 */

test.describe('purchase flow', () => {
  test('a signed-in customer can place an order request and receive an order number', async ({ page }) => {
    await registerCustomer(page);
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
    await expect(page.getByRole('heading', { level: 1, name: 'השלמת הזמנה' })).toBeVisible();

    await expect(page.getByText('פרטי התשלום והמסירה יתואמו לאחר אישור ההזמנה.')).toBeVisible();
    // And no card fields may be presented.
    await expect(page.locator('input[autocomplete="cc-number"]')).toHaveCount(0);

    // Scope to <main>: the footer newsletter form also has an email field.
    const form = page.locator('main');
    await form.getByLabel('דוא״ל').fill('guest@example.com');
    await form.getByLabel('שם פרטי').fill('ישראל');
    await form.getByLabel('שם משפחה').fill('ישראלי');
    await form.getByLabel('טלפון').fill('050-123-4567');
    await form.getByLabel('משלוח רגיל').check();
    await form.getByLabel('רחוב').fill('הרצל');
    await form.getByLabel('מספר בית').fill('12');
    await form.getByLabel('עיר').fill('תל אביב');

    await form.getByRole('button', { name: 'אישור הזמנה' }).click();

    // --- Confirmation -----------------------------------------------------
    await page.waitForURL(/\/checkout\/success/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'ההזמנה התקבלה' })).toBeVisible();

    const orderNumber = page.locator('[dir="ltr"]', { hasText: /^MK-\d{4}-\d{6}$/ }).first();
    await expect(orderNumber).toBeVisible();

    // The order must be labelled as a development order, never as a real sale.
    await expect(page.getByText(/לא בוצע חיוב אמיתי/)).toBeVisible();
  });

  test('an available product exposes its add-to-cart action', async ({ page }) => {
    await page.goto('/shop/precious-vanilla');
    await expect(page.getByRole('button', { name: 'הוספה לעגלה' }).first()).toBeEnabled();
  });

  test('an invalid coupon is rejected with a Hebrew reason', async ({ page }) => {
    await page.goto('/shop/adventure');
    // The buy box is the first add-to-cart on the page; related products follow.
    await page.getByRole('button', { name: 'הוספה לעגלה' }).first().click();
    await expect(page.getByText('נוסף לעגלה').first()).toBeVisible();

    await page.goto('/cart');
    await page.getByLabel('קוד קופון').fill('NOPE-DOES-NOT-EXIST');
    await page.getByRole('button', { name: 'החלת קופון' }).click();

    await expect(page.getByText('קוד הקופון אינו תקין')).toBeVisible();
  });

  test('an incomplete checkout scrolls to and focuses the first invalid field', async ({ page }) => {
    await registerCustomer(page);
    await page.goto('/shop/adventure');
    await page.getByRole('button', { name: 'הוספה לעגלה' }).first().click();
    await expect(page.getByText('נוסף לעגלה').first()).toBeVisible();

    await page.goto('/checkout');
    await expect(page.getByRole('heading', { level: 1, name: 'השלמת הזמנה' })).toBeVisible();

    // Submit with everything empty.
    await page.getByRole('button', { name: 'אישור הזמנה' }).click();

    // Error summary appears and lists fields.
    await expect(page.getByText('יש לתקן את הפרטים הבאים:')).toBeVisible();

    // Registration prefills email and names, so phone is the first missing
    // required field and receives focus.
    const phone = page.locator('main input[name="phone"]');
    await expect(phone).toBeFocused();
    // And its Hebrew error text is shown.
    await expect(page.locator('main input[name="phone"] ~ p[role="alert"]')).toBeVisible();

    await phone.fill('050-123-4567');
    await expect(phone).toHaveValue('050-123-4567');
  });

  test('checkout error focus works under reduced motion', async ({ page }) => {
    await registerCustomer(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/shop/adventure');
    await page.getByRole('button', { name: 'הוספה לעגלה' }).first().click();
    await expect(page.getByText('נוסף לעגלה').first()).toBeVisible();

    await page.goto('/checkout');
    await page.getByRole('button', { name: 'אישור הזמנה' }).click();

    await expect(page.getByText('יש לתקן את הפרטים הבאים:')).toBeVisible();
    await expect(page.locator('main input[name="phone"]')).toBeFocused();
  });

  test('order summary reacts to shipping and remains usable at the active viewport', async ({ page }) => {
    await registerCustomer(page);
    await page.goto('/shop/adventure');
    await page.getByRole('button', { name: 'הוספה לעגלה' }).first().click();
    await expect(page.getByText('נוסף לעגלה').first()).toBeVisible();
    await page.goto('/checkout');

    await expect(page.getByTestId('shipping-total')).toHaveText('חינם');
    const pickupTotal = await page.getByTestId('order-total').textContent();

    await page.getByLabel('משלוח רגיל').check();
    await expect(page.getByTestId('shipping-total')).toContainText('25.00');
    await expect(page.getByTestId('order-total')).not.toHaveText(pickupTotal ?? '');

    await page.getByLabel('משלוח מהיר').check();
    await expect(page.getByTestId('shipping-total')).toContainText('50.00');

    const layout = await page.getByTestId('checkout-layout').boundingBox();
    const main = await page.getByTestId('checkout-main').boundingBox();
    const summary = await page.getByTestId('order-summary').boundingBox();
    expect(layout).not.toBeNull();
    expect(main).not.toBeNull();
    expect(summary).not.toBeNull();

    if (page.viewportSize()!.width >= 1024) {
      expect(Math.abs(main!.y - summary!.y)).toBeLessThan(12);
      expect(summary!.x).toBeLessThan(main!.x);
    } else {
      expect(summary!.y).toBeGreaterThan(main!.y);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
