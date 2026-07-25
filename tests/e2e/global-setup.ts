import 'dotenv/config';

/**
 * E2E safety gate.
 *
 * Playwright must NEVER run against the development (or production) database.
 * This aborts the whole run unless a properly isolated TEST_DATABASE_URL is
 * configured. The same checks live at the top of playwright.config.ts so the
 * run aborts before the web server even starts; this is the belt-and-braces
 * copy that also logs which database is in use.
 */
export default function globalSetup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;

  if (!testUrl) {
    throw new Error(
      'E2E aborted: TEST_DATABASE_URL is not set. Run `npm run db:test-setup` and set it in .env.',
    );
  }
  if (testUrl === devUrl) {
    throw new Error('E2E aborted: TEST_DATABASE_URL must be different from DATABASE_URL.');
  }
  let name = '';
  try {
    name = new URL(testUrl).pathname.slice(1).split('?')[0];
  } catch {
    throw new Error('E2E aborted: TEST_DATABASE_URL is not a valid URL.');
  }
  if (!/test/i.test(name)) {
    throw new Error(`E2E aborted: test database name "${name}" must contain "test".`);
  }

  console.log(`[e2e] isolated test database in use: ${name}`);
}
