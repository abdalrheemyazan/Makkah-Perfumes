import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * Projects:
 *   setup            — logs in once and stores the admin session
 *   desktop / mobile — storefront specs, signed out
 *   *-admin          — admin specs, reusing the stored session
 *
 * DATABASE ISOLATION: E2E runs against TEST_DATABASE_URL, never the development
 * database. The guard below aborts the whole run (before the web server starts)
 * unless a properly isolated test database is configured, and the web server is
 * launched with DATABASE_URL pointed at it. Run `npm run db:test-setup` once to
 * create/seed that database.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const E2E_PORT = Number(process.env.E2E_PORT ?? 3000);
const E2E_ORIGIN = process.env.E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`;
(function assertIsolatedTestDb() {
  if (!TEST_DB) {
    throw new Error(
      'E2E aborted: TEST_DATABASE_URL is not set. Run `npm run db:test-setup` and set it in .env.',
    );
  }
  if (TEST_DB === process.env.DATABASE_URL) {
    throw new Error('E2E aborted: TEST_DATABASE_URL must be different from DATABASE_URL.');
  }
  let name = '';
  try {
    name = new URL(TEST_DB).pathname.slice(1).split('?')[0];
  } catch {
    throw new Error('E2E aborted: TEST_DATABASE_URL is not a valid URL.');
  }
  if (!/test/i.test(name)) {
    throw new Error(`E2E aborted: test database name "${name}" must contain "test".`);
  }
})();

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: E2E_ORIGIN,
    locale: 'he-IL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Chromium defaults to /dev/shm for shared memory, which is tiny in many
    // headless/CI environments. Capturing full-page screenshots of the tall,
    // animated homepage exhausted it and crashed the browser ("Target page …
    // has been closed"). This flag routes shared memory to /tmp instead.
    launchOptions: { args: ['--disable-dev-shm-usage'] },
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
      // Screenshots run here too, so every capture exists at both viewports.
      testMatch: [/admin\.spec\.ts/, /screenshots\.spec\.ts/],
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: `npm run dev -- -p ${E2E_PORT}`,
    url: E2E_ORIGIN,
    // Never reuse a server that might be pointed at the development database —
    // always start a fresh one bound to the isolated test database.
    reuseExistingServer: false,
    timeout: 120_000,
    // Next.js does not override already-set env vars from .env, so this wins.
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB!,
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? '.next-e2e',
    },
  },
});
