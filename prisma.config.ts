import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moves the connection URL out of schema.prisma and into this file.
 *
 * The CLI (migrate / studio / db pull) reads `datasource.url` from here.
 * The application runtime connects through the `@prisma/adapter-pg` driver
 * adapter configured in src/lib/db.ts. Both read the same DATABASE_URL, so the
 * CLI and the app always target the same database.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
