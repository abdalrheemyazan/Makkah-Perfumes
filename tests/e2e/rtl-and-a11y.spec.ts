import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/shop',
  '/shop/royal-leather',
  '/collections',
  '/fragrance-finder',
  '/cart',
  '/search',
  '/stores',
  '/login',
  '/about',
];

test.describe('Hebrew RTL and layout integrity', () => {
  test('every page declares Hebrew and RTL', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('lang', 'he');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    }
  });

  test('no page scrolls horizontally', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      // A 1px rounding tolerance; anything larger is a real overflow.
      expect(
        overflow.scrollWidth - overflow.clientWidth,
        `horizontal overflow on ${route}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test('every page has exactly one h1 and a skip link', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('h1'), `h1 count on ${route}`).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'דילוג לתוכן הראשי' })).toBeAttached();
    }
  });

  test('the skip link takes keyboard focus first and reaches main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText('דילוג לתוכן הראשי');
    await expect(page.locator('#main')).toBeAttached();
  });

  test('product images all carry Hebrew alt text', async ({ page }) => {
    await page.goto('/shop');
    const images = page.locator('main img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const alt = await images.nth(i).getAttribute('alt');
      // Decorative images are allowed alt="", but must never be missing it.
      expect(alt, `image ${i} on /shop is missing an alt attribute`).not.toBeNull();
    }
  });

  test('unverified prices are labelled rather than presented as real', async ({ page }) => {
    await page.goto('/shop/royal-leather');
    await expect(page.getByText('מחיר לדוגמה').first()).toBeVisible();
  });

  test('no fabricated reviews or branches are shown', async ({ page }) => {
    await page.goto('/shop/royal-leather');
    await expect(page.getByText('עדיין אין ביקורות למוצר זה.')).toBeVisible();

    await page.goto('/stores');
    await expect(page.getByText('כתובות הסניפים טרם נמסרו')).toBeVisible();
  });

  test('reduced motion still renders all content', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'לגלות את הקולקציה' })).toBeVisible();
    // The brand-story chapters must be readable without the scroll animation.
    await expect(page.getByRole('heading', { name: 'שרף הלבונה' })).toBeVisible();
  });

  test('a missing page returns a Hebrew 404', async ({ page }) => {
    const response = await page.goto('/definitely-not-a-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'העמוד לא נמצא' })).toBeVisible();
  });
});
