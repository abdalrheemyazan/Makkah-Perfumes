import { expect, test as setup } from '@playwright/test';

/**
 * Authenticates once and saves the session for every admin spec to reuse.
 *
 * Logging in inside each test tripped the login rate limiter (10 attempts per
 * 5 minutes per IP) once the desktop and mobile projects ran back to back —
 * the limiter behaving exactly as intended. Reusing storage state is also the
 * Playwright-recommended pattern and removes ~18 redundant logins per run.
 */

export const ADMIN_STATE = 'playwright/.auth/admin.json';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@makkah.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!makkah';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');

  const form = page.locator('main');
  await form.getByLabel('דוא״ל').fill(ADMIN_EMAIL);
  await form.getByLabel('סיסמה').fill(ADMIN_PASSWORD);
  await form.getByRole('button', { name: 'התחברות' }).click();

  await page.waitForURL(/\/account/, { timeout: 30_000 });

  // Confirm the session really grants admin access before saving it.
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'לוח בקרה' })).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE });
});
