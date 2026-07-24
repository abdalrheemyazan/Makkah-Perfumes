import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTimeHe } from '@/lib/utils';
import { Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'יומן פעולות' };

const PAGE_SIZE = 50;

type SearchParams = Promise<{ page?: string }>;

export default async function AdminAuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability('audit.read');
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    }),
    db.auditLog.count(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        titleHe="יומן פעולות"
        descriptionHe={`${total} רשומות. סודות, סיסמאות ופרטי תשלום אינם נרשמים ביומן.`}
      />

      {entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="היומן ריק"
            descriptionHe="כל פעולת ניהול תירשם כאן אוטומטית."
          />
        </div>
      ) : (
        <>
          <Table headers={['פעולה', 'ישות', 'משתמש', 'מתי', 'פרטים']}>
            {entries.map((entry) => (
              <Row key={entry.id}>
                <Cell labelHe="פעולה">
                  <span className="text-ivory" dir="ltr">
                    {entry.action}
                  </span>
                </Cell>
                <Cell labelHe="ישות">
                  <span className="text-xs text-muted" dir="ltr">
                    {entry.entityType}
                    {entry.entityId ? `#${entry.entityId.slice(0, 8)}` : ''}
                  </span>
                </Cell>
                <Cell labelHe="משתמש">
                  <span className="text-xs" dir="ltr">
                    {entry.user?.email ?? 'מערכת'}
                  </span>
                </Cell>
                <Cell labelHe="מתי">
                  <span className="text-xs text-muted">{formatDateTimeHe(entry.createdAt)}</span>
                </Cell>
                <Cell labelHe="פרטים">
                  {entry.metadata ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gold">הצגה</summary>
                      <pre
                        dir="ltr"
                        className="mt-2 max-w-md overflow-x-auto rounded-sm bg-ink p-2 text-[0.7rem] text-cream/80"
                      >
                        {entry.metadata}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-xs text-faint">—</span>
                  )}
                </Cell>
              </Row>
            ))}
          </Table>

          {pageCount > 1 && (
            <nav aria-label="ניווט בין עמודים" className="mt-8 flex justify-center gap-2">
              {Array.from({ length: Math.min(pageCount, 20) }, (_, index) => index + 1).map(
                (number) => (
                  <Link
                    key={number}
                    href={number === 1 ? '/admin/audit-log' : `/admin/audit-log?page=${number}`}
                    aria-current={number === page ? 'page' : undefined}
                    className={
                      number === page
                        ? 'ltr-nums grid h-9 w-9 place-items-center rounded-sm bg-gold text-sm text-ink'
                        : 'ltr-nums grid h-9 w-9 place-items-center rounded-sm border border-gold/25 text-sm text-cream hover:border-gold'
                    }
                  >
                    {number}
                  </Link>
                ),
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
