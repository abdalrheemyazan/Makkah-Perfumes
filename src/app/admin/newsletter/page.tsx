import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTimeHe } from '@/lib/utils';
import { Badge, Cell, EmptyState, PageHeader, Row, StatCard, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'ניוזלטר' };

export default async function AdminNewsletterPage() {
  await requireCapability('content.write');

  const [subscribers, active, unsubscribed] = await Promise.all([
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
  ]);

  return (
    <div>
      <PageHeader
        titleHe="ניוזלטר"
        descriptionHe="כל רישום כולל תיעוד הסכמה מפורשת, כנדרש בחוק הדיוור הישראלי."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard labelHe="נרשמים פעילים" value={String(active)} />
        <StatCard labelHe="הסירו הרשמה" value={String(unsubscribed)} />
        <StatCard labelHe="סה״כ" value={String(active + unsubscribed)} />
      </div>

      {subscribers.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="אין נרשמים"
            descriptionHe="רישומים מטופס הניוזלטר באתר יופיעו כאן."
          />
        </div>
      ) : (
        <Table headers={['דוא״ל', 'מקור', 'תאריך הסכמה', 'סטטוס']}>
          {subscribers.map((subscriber) => (
            <Row key={subscriber.id}>
              <Cell labelHe="דוא״ל">
                <span className="text-xs" dir="ltr">
                  {subscriber.email}
                </span>
              </Cell>
              <Cell labelHe="מקור">
                <span className="text-xs text-muted">{subscriber.consentSource}</span>
              </Cell>
              <Cell labelHe="תאריך הסכמה">
                <span className="text-xs text-muted">
                  {formatDateTimeHe(subscriber.consentedAt)}
                </span>
              </Cell>
              <Cell labelHe="סטטוס">
                <Badge tone={subscriber.unsubscribedAt ? 'neutral' : 'success'}>
                  {subscriber.unsubscribedAt ? 'הוסר' : 'פעיל'}
                </Badge>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}
