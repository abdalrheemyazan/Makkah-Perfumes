import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { CONTENT_BLOCK_KIND_LABELS } from '@/lib/admin/labels';
import { Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { ContentBlockForm } from '@/components/admin/content-block-form';

export const metadata: Metadata = { title: 'תוכן האתר' };

export default async function AdminContentPage() {
  await requireCapability('content.write');

  const blocks = await db.contentBlock.findMany({ orderBy: { position: 'asc' } });

  return (
    <div>
      <PageHeader
        titleHe="תוכן האתר"
        descriptionHe="עריכת הטקסטים והמדיה של עמוד הבית. שינויים נכנסים לתוקף מיד."
      />

      {blocks.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="אין בלוקי תוכן"
            descriptionHe="בלוקי התוכן נוצרים בזריעת בסיס הנתונים."
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {blocks.map((block) => (
            <Card
              key={block.key}
              titleHe={CONTENT_BLOCK_KIND_LABELS[block.kind] ?? block.kind}
              descriptionHe={block.key}
            >
              <ContentBlockForm
                showMedia={block.kind === 'HERO' || block.kind === 'BANNER'}
                block={{
                  key: block.key,
                  kind: block.kind,
                  titleHe: block.titleHe ?? '',
                  bodyHe: block.bodyHe ?? '',
                  ctaLabelHe: block.ctaLabelHe ?? '',
                  ctaHref: block.ctaHref ?? '',
                  mediaUrl: block.mediaUrl ?? '',
                  posterUrl: block.posterUrl ?? '',
                  mobileUrl: block.mobileUrl ?? '',
                  isPublished: block.isPublished,
                }}
              />
            </Card>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Card titleHe="עמודי מדיניות" descriptionHe="ניווט, כותרת תחתונה ועמודי מדיניות">
          <p className="text-sm leading-relaxed text-muted">
            תפריט הניווט והכותרת התחתונה מוגדרים כרגע בקוד
            (<span dir="ltr">src/lib/site.ts</span>). עמודי המדיניות ממתינים לנוסח משפטי
            מאושר ולפרטי הישות המשפטית — ראו{' '}
            <span dir="ltr">docs/MISSING_BUSINESS_DATA.md</span>. הם יועברו לניהול מכאן
            עם קבלת התוכן.
          </p>
        </Card>
      </div>
    </div>
  );
}
