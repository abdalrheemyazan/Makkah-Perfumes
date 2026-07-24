import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Admin UI kit.
 *
 * Server components by default — the admin is mostly tables and forms, and
 * forms post to Server Actions, so very little needs to be interactive.
 * Everything is Hebrew and relies on `dir="rtl"` inheritance plus logical
 * properties; no directional overrides anywhere.
 */

export function PageHeader({
  titleHe,
  descriptionHe,
  action,
}: {
  titleHe: string;
  descriptionHe?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gold/15 pb-6">
      <div>
        <h1 className="font-serif text-3xl text-ivory">{titleHe}</h1>
        {descriptionHe && <p className="mt-2 max-w-2xl text-sm text-muted">{descriptionHe}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function StatCard({
  labelHe,
  value,
  hintHe,
  tone = 'default',
}: {
  labelHe: string;
  value: string;
  hintHe?: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  return (
    <div className="rounded-sm border border-gold/15 bg-charcoal p-5">
      <p className="text-xs text-muted">{labelHe}</p>
      <p
        className={cn(
          'ltr-nums mt-2 font-serif text-2xl',
          tone === 'warning' && 'text-warning',
          tone === 'success' && 'text-success',
          tone === 'default' && 'text-ivory',
        )}
      >
        {value}
      </p>
      {hintHe && <p className="mt-1 text-xs text-faint">{hintHe}</p>}
    </div>
  );
}

/** Honest empty state. Used instead of zero-filled charts or invented rows. */
export function EmptyState({
  titleHe,
  descriptionHe,
  action,
}: {
  titleHe: string;
  descriptionHe?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-dashed border-gold/25 bg-charcoal/60 p-10 text-center">
      <p className="font-serif text-lg text-ivory">{titleHe}</p>
      {descriptionHe && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{descriptionHe}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Responsive table. On narrow screens each row becomes a stacked card via the
 * `data-label` attribute, so the admin is usable on a phone without a
 * horizontal scrollbar.
 */
export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-0 border-collapse text-sm">
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-gold/15 text-start">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-3 py-3 text-start text-xs font-medium tracking-wide text-gold"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gold/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr className="block border-b border-gold/10 py-3 md:table-row md:border-0 md:py-0">
      {children}
    </tr>
  );
}

export function Cell({
  children,
  labelHe,
  className,
}: {
  children: React.ReactNode;
  /** Shown as the field label in the stacked mobile layout. */
  labelHe?: string;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'flex items-baseline justify-between gap-3 px-3 py-1.5 text-cream/90 md:table-cell md:py-3',
        className,
      )}
    >
      {labelHe && (
        <span className="text-xs text-faint md:hidden" aria-hidden="true">
          {labelHe}
        </span>
      )}
      <span className="min-w-0 text-end md:text-start">{children}</span>
    </td>
  );
}

const BADGE_TONES = {
  neutral: 'border-faint/40 text-muted',
  gold: 'border-gold/50 text-gold',
  success: 'border-success/50 text-success',
  warning: 'border-warning/50 text-warning',
  danger: 'border-danger/50 text-danger',
} as const;

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: keyof typeof BADGE_TONES;
}) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm border px-2 py-0.5 text-[0.7rem] whitespace-nowrap',
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Marks a value that has not been verified with the brand. */
export function DevDataBadge() {
  return (
    <Badge tone="warning">
      <span title="נתוני פיתוח — לא לפרסום">נתוני פיתוח</span>
    </Badge>
  );
}

export function AdminButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center rounded-sm px-4 text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-gold text-ink hover:bg-cream'
          : 'border border-gold/40 text-cream hover:border-gold hover:text-ivory',
      )}
    >
      {children}
    </Link>
  );
}

export function Card({
  titleHe,
  children,
  descriptionHe,
}: {
  titleHe?: string;
  descriptionHe?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-gold/15 bg-charcoal p-6">
      {titleHe && <h2 className="font-serif text-lg text-ivory">{titleHe}</h2>}
      {descriptionHe && <p className="mt-1 text-xs text-muted">{descriptionHe}</p>}
      <div className={titleHe ? 'mt-5' : ''}>{children}</div>
    </section>
  );
}

export function DefinitionList({
  rows,
}: {
  rows: { labelHe: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {rows.map((row) => (
        <div key={row.labelHe} className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-muted">{row.labelHe}</dt>
          <dd className="min-w-0 text-end text-cream">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
