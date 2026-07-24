import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * Projects:
 *   setup            — logs in once and stores the admin session
 *   desktop / mobile — storefront specs, signed out
 *   *-admin          — admin specs, reusing the stored session
 *
 * Splitting the admin projects out means the app's real login rate limiter is
 * exercised once rather than fought on every test.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'he-IL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/admin\.spec\.ts/, /screenshots\.spec\.ts/, /auth\.setup\.ts/],
    },
    {
      // Pixel 7 is Chromium-based, so mobile layout and touch behaviour are
      // covered by the browser that is already installed. iOS Safari still
      // needs a manual pass — see docs/TESTING.md.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testIgnore: [/admin\.spec\.ts/, /screenshots\.spec\.ts/, /auth\.setup\.ts/],
    },

    {
      name: 'desktop-admin',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
      testMatch: [/admin\.spec\.ts/, /screenshots\.spec\.ts/],
      dependencies: ['setup'],
    },
    {
      name: 'mobile-admin',
      use: { ...devices['Pixel 7'], storageState: 'playwright/.auth/admin.json' },
      testMatch: /admin\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
