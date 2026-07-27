import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTimeHe } from '@/lib/utils';
import { CONTACT_STATUS_LABELS } from '@/lib/admin/labels';
import { Badge, Card, DefinitionList, PageHeader } from '@/components/admin/ui';
import { ContactRequestActions } from '@/components/admin/contact-request-actions';

export const metadata: Metadata = { title: 'פנייה' };

const STATUS_TONE: Record<string, 'gold' | 'warning' | 'success' | 'neutral'> = {
  NEW: 'gold',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ARCHIVED: 'neutral',
  READ: 'neutral',
};

export default async function ContactRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability('messages.read');
  const { id } = await params;

  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) notFound();

  const handledBy = message.handledByUserId
    ? await db.user.findUnique({
        where: { id: message.handledByUserId },
        select: { firstName: true, lastName: true, email: true },
      })
    : null;
  const handledByName = handledBy
    ? [handledBy.firstName, handledBy.lastName].filter(Boolean).join(' ') || handledBy.email
    : null;

  return (
    <div>
      <PageHeader
        titleHe={message.subject}
        descriptionHe={`התקבלה ${formatDateTimeHe(message.createdAt)}`}
        action={
          <Badge tone={STATUS_TONE[message.status] ?? 'neutral'}>
            {CONTACT_STATUS_LABELS[message.status] ?? message.status}
          </Badge>
        }
      />

      <div className="mt-6">
        <Link href="/admin/contact-requests" className="text-sm text-gold hover:text-cream">
          ← חזרה לכל הפניות
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Card titleHe="ההודעה">
            {/* Rendered as plain text — React escapes it, so no HTML executes. */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-cream/90">
              {message.message}
            </p>
          </Card>

          <Card titleHe="טיפול">
            <ContactRequestActions id={message.id} status={message.status} note={message.adminNote} />
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card titleHe="פרטי הפונה">
            <DefinitionList
              rows={[
                { labelHe: 'שם', value: message.name },
                {
                  labelHe: 'דוא״ל',
                  value: (
                    <a
                      href={`mailto:${message.email}`}
                      className="ltr-nums text-gold hover:text-cream"
                      dir="ltr"
                    >
                      {message.email}
                    </a>
                  ),
                },
                {
                  labelHe: 'טלפון',
                  value: message.phone ? (
                    <a
                      href={`tel:${message.phone}`}
                      className="ltr-nums text-gold hover:text-cream"
                      dir="ltr"
                    >
                      {message.phone}
                    </a>
                  ) : (
                    '—'
                  ),
                },
                {
                  labelHe: 'לקוח רשום',
                  value: message.userId ? 'כן' : 'לא',
                },
              ]}
            />
          </Card>

          <Card titleHe="מטא-דאטה">
            <DefinitionList
              rows={[
                { labelHe: 'התקבלה', value: formatDateTimeHe(message.createdAt) },
                {
                  labelHe: 'טופלה לאחרונה',
                  value: message.handledAt ? formatDateTimeHe(message.handledAt) : '—',
                },
                { labelHe: 'טופלה ע״י', value: handledByName ?? '—' },
              ]}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
