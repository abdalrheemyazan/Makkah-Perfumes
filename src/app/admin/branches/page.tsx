import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'סניפים' };

export default async function AdminBranchesPage() {
  await requireCapability('content.write');

  const branches = await db.branch.findMany({ orderBy: { position: 'asc' } });

  return (
    <div>
      <PageHeader
        titleHe="סניפים"
        descriptionHe="סניף מפורסם מופיע בעמוד הסניפים באתר וב־structured data."
      />

      {branches.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="אין סניפים"
            descriptionHe="לא הוזנו סניפים לדוגמה במכוון. כתובות, שעות פתיחה וטלפונים טרם התקבלו מהמותג, ולכן עמוד הסניפים באתר מציג מצב ריק ואין נתוני LocalBusiness."
          />
        </div>
      ) : (
        <Table headers={['שם', 'כתובת', 'עיר', 'טלפון', 'סטטוס']}>
          {branches.map((branch) => (
            <Row key={branch.id}>
              <Cell labelHe="שם">
                <span className="text-ivory">{branch.nameHe}</span>
              </Cell>
              <Cell labelHe="כתובת">
                <span className="text-xs text-muted">{branch.addressHe}</span>
              </Cell>
              <Cell labelHe="עיר">
                <span className="text-xs text-muted">{branch.cityHe}</span>
              </Cell>
              <Cell labelHe="טלפון">
                <span className="text-xs" dir="ltr">
                  {branch.phone ?? '—'}
                </span>
              </Cell>
              <Cell labelHe="סטטוס">
                <Badge tone={branch.isPublished ? 'success' : 'neutral'}>
                  {branch.isPublished ? 'מפורסם' : 'מוסתר'}
                </Badge>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}
