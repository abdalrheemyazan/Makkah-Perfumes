import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateHe } from '@/lib/utils';
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'מגזין' };

export default async function AdminJournalPage() {
  await requireCapability('content.write');

  const posts = await db.journalPost.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <PageHeader titleHe="מגזין" descriptionHe="כתבות תוכן על חומרי גלם ומסורות בישום." />

      {posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="אין כתבות"
            descriptionHe="לא נוצרו כתבות לדוגמה במכוון — תוכן המגזין ייכתב על ידי המותג. עמוד המגזין באתר מציג מצב ריק עד אז."
          />
        </div>
      ) : (
        <Table headers={['כותרת', 'כתובת', 'סטטוס', 'פורסם']}>
          {posts.map((post) => (
            <Row key={post.id}>
              <Cell labelHe="כותרת">
                <span className="text-ivory">{post.titleHe}</span>
              </Cell>
              <Cell labelHe="כתובת">
                <span className="text-xs" dir="ltr">
                  {post.slug}
                </span>
              </Cell>
              <Cell labelHe="סטטוס">
                <Badge tone={post.isPublished ? 'success' : 'neutral'}>
                  {post.isPublished ? 'מפורסמת' : 'טיוטה'}
                </Badge>
              </Cell>
              <Cell labelHe="פורסם">
                <span className="text-xs text-muted">
                  {post.publishedAt ? formatDateHe(post.publishedAt) : '—'}
                </span>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}
