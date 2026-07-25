import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTimeHe } from '@/lib/utils';
import { Badge, Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { MessageActions } from '@/components/admin/message-actions';

export const metadata: Metadata = { title: 'פניות' };

type SearchParams = Promise<{ status?: string }>;

const FILTERS = [
  { value: 'all', labelHe: 'הכול' },
  { value: 'NEW', labelHe: 'חדשות' },
  { value: 'READ', labelHe: 'נקראו' },
  { value: 'RESOLVED', labelHe: 'טופלו' },
] as const;

const STATUS_LABEL: Record<string, string> = { NEW: 'חדשה', READ: 'נקראה', RESOLVED: 'טופלה' };

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability('messages.read');
  const { status } = await searchParams;
  const active = FILTERS.some((f) => f.value === status) ? status! : 'all';

  const [messages, counts] = await Promise.all([
    db.contactMessage.findMany({
      where: active === 'all' ? {} : { status: active as 'NEW' | 'READ' | 'RESOLVED' },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
      include: { user: { select: { id: true, email: true } } },
    }),
    db.contactMessage.groupBy({ by: ['status'], _count: true }),
  ]);

  const unread = counts.find((c) => c.status === 'NEW')?._count ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <div>
      <PageHeader
        titleHe="פניות"
        descriptionHe={
          total === 0
            ? 'פניות שנשלחות מטופס יצירת הקשר יופיעו כאן.'
            : `${total} פניות · ${unread} חדשות`
        }
      />

      <nav aria-label="סינון פניות" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === 'all' ? '/admin/messages' : `/admin/messages?status=${filter.value}`}
            aria-current={active === filter.value ? 'page' : undefined}
            className={
              active === filter.value
                ? 'rounded-sm bg-gold px-3 py-1.5 text-xs font-medium text-ink'
                : 'rounded-sm border border-gold/25 px-3 py-1.5 text-xs text-cream hover:border-gold'
            }
          >
            {filter.labelHe}
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="אין פניות להצגה"
            descriptionHe="כשלקוח ישלח פנייה מטופס יצירת הקשר, היא תופיע כאן לטיפול."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {messages.map((message) => (
            <Card key={message.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-serif text-base text-ivory">{message.subject}</h3>
                  <p className="mt-1 text-sm text-cream/90">{message.name}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {message.email}
                    {message.phone ? ` · ${message.phone}` : ''}
                  </p>
                </div>
                <Badge
                  tone={
                    message.status === 'RESOLVED'
                      ? 'success'
                      : message.status === 'READ'
                        ? 'neutral'
                        : 'warning'
                  }
                >
                  {STATUS_LABEL[message.status]}
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-cream/85">
                {message.message}
              </p>

              <p className="mt-3 text-xs text-faint">
                {formatDateTimeHe(message.createdAt)}
                {message.user ? (
                  <>
                    {' · '}
                    <Link href={`/admin/customers/${message.user.id}`} className="text-gold hover:text-cream">
                      חשבון לקוח
                    </Link>
                  </>
                ) : (
                  ' · אורח'
                )}
              </p>

              <MessageActions id={message.id} status={message.status} note={message.adminNote} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
