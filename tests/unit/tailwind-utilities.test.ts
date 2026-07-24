import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards against CSS-logical property names being used as Tailwind classes.
 *
 * `inset-inline-0`, `inset-block-start-3`, `border-inline-end` and friends are
 * valid *CSS properties* but are NOT Tailwind utilities — they compile to
 * nothing at all, silently. That is how the site header ended up
 * `position: fixed` with no inset, shrinking to its content instead of spanning
 * the page, and how product badges lost their corner placement.
 *
 * Tailwind's own logical utilities are `start-*` / `end-*` (inline) and
 * `top-*` / `bottom-*` / `inset-x-*` / `inset-y-*`, plus `border-s-*` /
 * `border-e-*`. Those are RTL-aware, so nothing is lost by using them.
 *
 * A failure here is a silently dead style, which is exactly the kind of bug
 * that survives typecheck, lint and a green build.
 */

const FORBIDDEN = [
  { pattern: /\binset-inline-[\w-]*/g, use: 'start-* / end-* / inset-x-*' },
  { pattern: /\binset-block-[\w-]*/g, use: 'top-* / bottom-* / inset-y-*' },
  { pattern: /\bborder-inline-[\w-]*/g, use: 'border-s-* / border-e-*' },
  { pattern: /\bborder-block-[\w-]*/g, use: 'border-t-* / border-b-*' },
  { pattern: /\bmargin-inline-[\w-]*/g, use: 'ms-* / me-* / mx-*' },
  { pattern: /\bpadding-inline-[\w-]*/g, use: 'ps-* / pe-* / px-*' },
];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    // Generated Prisma client is not hand-written styling.
    if (entry === 'generated' || entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) found.push(path);
  }
  return found;
}

describe('tailwind class names', () => {
  const files = sourceFiles('src');

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(FORBIDDEN)(
    'never uses CSS-logical names matching $pattern as classes',
    ({ pattern, use }) => {
      const offenders: string[] = [];

      for (const file of files) {
        const source = readFileSync(file, 'utf8');
        // Only look inside className strings; prose in comments is fine.
        for (const match of source.matchAll(/className=(?:"([^"]*)"|{`([^`]*)`}|{cn\(([^)]*)\))/g)) {
          const classes = match[1] ?? match[2] ?? match[3] ?? '';
          const hits = classes.match(pattern);
          if (hits) {
            offenders.push(`${file.replace(/\\/g, '/')} → ${[...new Set(hits)].join(', ')}`);
          }
        }
      }

      expect(
        offenders,
        `These compile to no CSS. Use ${use} instead:\n${offenders.join('\n')}`,
      ).toEqual([]);
    },
  );
});
