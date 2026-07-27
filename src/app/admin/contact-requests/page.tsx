import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTimeHe } from '@/lib/utils';
import { CONTACT_STATUS_LABELS } from '@/lib/admin/labels';
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';
import type { Prisma } from '@/generated/prisma/client';

export const metadata: Metadata = { title: 'פניות' };

const PAGE_SIZE = 20;

const FILTERS = [
  { value: 'all', labelHe: 'הכול' },
  { value: 'NEW', labelHe: 'חדשות' },
  { value: 'IN_PROGRESS', labelHe: 'בטיפול' },
  { value: 'RESOLVED', labelHe: 'טופלו' },
  { value: 'ARCHIVED', labelHe: 'ארכיון' },
] as const;

const STATUS_TONE: Record<string, 'gold' | 'warning' | 'success' | 'neutral'> = {
  NEW: 'gold',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ARCHIVED: 'neutral',
  READ: 'neutral',
};

export default async function ContactRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireCapability('messages.read');

  const params = await searchParams;
  const activeFilter = FILTERS.some((f) => f.value === params.status) ? params.status! : 'all';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const where: Prisma.ContactMessageWhereInput =
    activeFilter === 'all' ? {} : { status: activeFilter as never };

  const [total, newCount, rows] = await Promise.all([
    db.contactMessage.count({ where }),
    db.contactMessage.count({ where: { status: 'NEW' } }),
    db.contactMessage.findMany({
      where,
      // List view selects only what the table needs — the full message and
      // internal note load in the detail view.
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterHref = (status: string) =>
    status === 'all' ? '/admin/contact-requests' : `/admin/contact-requests?status=${status}`;

  return (
    <div>
      <PageHeader
        titleHe="פניות"
        descriptionHe={`${total} פניות${newCount > 0 ? ` · ${newCount} חדשות ממתינות לטיפול` : ''}.`}
      />

      {/* Status filter */}
      <nav aria-label="סינון לפי סטטוס" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === activeFilter;
          return (
            <Link
              key={f.value}
              href={filterHref(f.value)}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded-sm border border-gold/50 bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold'
                  : 'rounded-sm border border-gold/15 px-3 py-1.5 text-xs text-cream/80 hover:border-gold/40 hover:text-ivory'
              }
            >
              {f.labelHe}
              {f.value === 'NEW' && newCount > 0 ? ` (${newCount})` : ''}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="אין פניות להצגה"
            descriptionHe="פניות שיישלחו מטופס יצירת הקשר יופיעו כאן."
          />
        </div>
      ) : (
        <>
          <Table headers={['מבקש/ת', 'טלפון', 'נושא', 'הודעה', 'התקבלה', 'סטטוס', '']}>
            {rows.map((row) => (
              <Row key={row.id}>
                <Cell labelHe="מבקש/ת">
                  <span className="block text-ivory">{row.name}</span>
                  <span className="ltr-nums block text-xs text-faint" dir="ltr">
                    {row.email}
                  </span>
                </Cell>
                <Cell labelHe="טלפון">
                  {row.phone ? (
                    <span className="ltr-nums text-xs" dir="ltr">
                      {row.phone}
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Cell>
                <Cell labelHe="נושא">{row.subject}</Cell>
                <Cell labelHe="הודעה">
                  <span className="text-xs text-muted">
                    {row.message.length > 70 ? `${row.message.slice(0, 70)}…` : row.message}
                  </span>
                </Cell>
                <Cell labelHe="התקבלה">
                  <span className="text-xs text-faint">{formatDateTimeHe(row.createdAt)}</span>
                </Cell>
                <Cell labelHe="סטטוס">
                  <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                    {CONTACT_STATUS_LABELS[row.status] ?? row.status}
                  </Badge>
                </Cell>
                <Cell labelHe="">
                  <Link
                    href={`/admin/contact-requests/${row.id}`}
                    className="text-sm text-gold hover:text-cream"
                  >
                    צפייה
                  </Link>
                </Cell>
              </Row>
            ))}
          </Table>

          {totalPages > 1 && (
            <nav
              aria-label="ניווט בין עמודים"
              className="mt-6 flex items-center justify-between text-sm"
            >
              <PageLink
                href={`${filterHref(activeFilter)}${activeFilter === 'all' ? '?' : '&'}page=${page - 1}`}
                disabled={page <= 1}
                labelHe="הקודם"
              />
              <span className="ltr-nums text-xs text-faint">
                {page} / {totalPages}
              </span>
              <PageLink
                href={`${filterHref(activeFilter)}${activeFilter === 'all' ? '?' : '&'}page=${page + 1}`}
                disabled={page >= totalPages}
                labelHe="הבא"
              />
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function PageLink({ href, disabled, labelHe }: { href: string; disabled: boolean; labelHe: string }) {
  if (disabled) {
    return <span className="cursor-default rounded-sm border border-gold/10 px-3 py-1.5 text-faint">{labelHe}</span>;
  }
  return (
    <Link href={href} className="rounded-sm border border-gold/30 px-3 py-1.5 text-cream hover:border-gold hover:text-ivory">
      {labelHe}
    </Link>
  );
}
