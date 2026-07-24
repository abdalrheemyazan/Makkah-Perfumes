import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

/**
 * Captures real screenshots of the running application into docs/screenshots/.
 *
 * These are verification artefacts, not visual-regression assertions — the test
 * fails only if a page does not render, so a deliberate design change does not
 * break the suite.
 *
 * Run with: npx playwright test screenshots --project=desktop
 */

const OUT = 'docs/screenshots';

/** Let fonts, images and any scroll-triggered layout settle before capturing. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);
}

test.beforeAll(async () => {
  await mkdir(OUT, { recursive: true });
});

test.describe('storefront screenshots', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('capture public pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;

    await page.goto('/');
    await settle(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${OUT}/home-${suffix}.png` });
    await page.screenshot({ path: `${OUT}/home-full-${suffix}.png`, fullPage: true });

    // Mid-scroll, so the scroll-driven story sequence is visible in frame.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.4));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/home-story-${suffix}.png` });

    await page.goto('/shop');
    await settle(page);
    await page.screenshot({ path: `${OUT}/shop-${suffix}.png` });

    await page.goto('/shop/royal-leather');
    await settle(page);
    await page.screenshot({ path: `${OUT}/product-${suffix}.png` });

    await page.goto('/fragrance-finder');
    await settle(page);
    await page.screenshot({ path: `${OUT}/fragrance-finder-${suffix}.png` });
  });

  test('capture cart and checkout', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;

    await page.goto('/shop/royal-leather');
    await page.getByRole('button', { name: 'הוספה לעגלה' }).first().click();
    await expect(page.getByText('נוסף לעגלה').first()).toBeVisible();

    await page.goto('/cart');
    await settle(page);
    await page.screenshot({ path: `${OUT}/cart-${suffix}.png` });

    await page.goto('/checkout');
    await settle(page);
    await page.screenshot({ path: `${OUT}/checkout-${suffix}.png` });
  });

  test('capture reduced-motion homepage', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await settle(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({
      path: `${OUT}/home-reduced-motion-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

test.describe('admin screenshots', () => {
  test('capture admin pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;

    await page.goto('/admin');
    await settle(page);
    await expect(page.getByRole('heading', { level: 1, name: 'לוח בקרה' })).toBeVisible();
    await page.screenshot({ path: `${OUT}/admin-dashboard-${suffix}.png`, fullPage: true });

    await page.goto('/admin/products');
    await settle(page);
    await page.screenshot({ path: `${OUT}/admin-products-${suffix}.png` });

    // Open the first product's editor.
    await page.locator('a[href^="/admin/products/"]').first().click();
    await settle(page);
    await page.screenshot({ path: `${OUT}/admin-product-editor-${suffix}.png`, fullPage: true });

    await page.goto('/admin/orders');
    await settle(page);
    await page.screenshot({ path: `${OUT}/admin-orders-${suffix}.png` });

    await page.locator('a[dir="ltr"]').first().click();
    await settle(page);
    await page.screenshot({ path: `${OUT}/admin-order-detail-${suffix}.png`, fullPage: true });

    await page.goto('/admin/inventory');
    await settle(page);
    await page.screenshot({ path: `${OUT}/admin-inventory-${suffix}.png` });

    await page.goto('/admin/content');
    await settle(page);
    await page.screenshot({ path: `${OUT}/admin-content-${suffix}.png` });
  });
});
