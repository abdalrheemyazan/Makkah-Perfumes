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

/**
 * Freezes all animation for capture.
 *
 * Screenshots are static, so continuous CSS animations add nothing — but the
 * hero's large blurred, endlessly-animating ambient layers accumulate work in
 * the headless software rasterizer and crash the desktop renderer over a
 * multi-screenshot pass. Pinning every animation to its final frame removes
 * that load and makes captures deterministic. Real users never see this style.
 */
async function freezeAnimation(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }`,
  });
}

test.beforeAll(async () => {
  await mkdir(OUT, { recursive: true });
});

test.describe('storefront screenshots', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // A still frame cannot depict motion, so the hero is captured under reduced
  // motion: every layer renders at its resting position — visually identical to
  // a frozen frame of the live version — without the continuously animated,
  // heavily blurred ambient layers that crash the headless desktop renderer
  // when left running through the capture.
  test('capture hero', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await settle(page);
    await freezeAnimation(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${OUT}/home-${suffix}.png` });
  });

  /**
   * Section captures run under reduced motion, in their own test.
   *
   * Two reasons this is a separate, reduced-motion test rather than part of a
   * long capture sequence:
   *   - Reduced motion drops the ScrollTrigger pin, so the story renders in its
   *     stacked form and the page is a normal, stable height. The static layout
   *     is representative — shop/discovery/frankincense never animate anyway.
   *   - A fresh page per test keeps cumulative renderer memory low. Capturing
   *     everything in one page lifecycle crashed the desktop headless browser.
   */
  test('capture homepage sections', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await settle(page);
    await freezeAnimation(page);
    await page.screenshot({ path: `${OUT}/home-full-${suffix}.png`, fullPage: true });

    for (const [anchor, name] of [
      ['#story-heading', 'home-story'],
      ['#featured-heading', 'home-shop'],
      ['#discovery-heading', 'home-discovery'],
      ['#frankincense-heading', 'home-frankincense'],
    ] as const) {
      await page.locator(anchor).scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${name}-${suffix}.png` });
    }
  });

  test('capture shop and product', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;

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
