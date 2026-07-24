import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateHe } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/admin/labels';
import { Badge, Card, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'משתמשי מערכת' };

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'ORDER_MANAGER',
  'INVENTORY_MANAGER',
  'SUPPORT_AGENT',
] as const;

export default async function AdminUsersPage() {
  await requireCapability('users.write');

  const staff = await db.user.findMany({
    where: { roles: { some: { role: { name: { in: [...STAFF_ROLES] } } } } },
    orderBy: { createdAt: 'asc' },
    include: { roles: { include: { role: true } }, sessions: { select: { id: true } } },
  });

  return (
    <div>
      <PageHeader
        titleHe="משתמשי מערכת"
        descriptionHe={`${staff.length} משתמשים עם הרשאת גישה ללוח הניהול`}
      />

      {staff.length === 0 ? (
        <div className="mt-8">
          <EmptyState titleHe="אין משתמשי מערכת" />
        </div>
      ) : (
        <Table headers={['שם', 'דוא״ל', 'תפקידים', 'סשנים', 'נוצר', 'סטטוס']}>
          {staff.map((user) => (
            <Row key={user.id}>
              <Cell labelHe="שם">
                <Link href={`/admin/customers/${user.id}`} className="text-ivory hover:text-gold">
                  {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                </Link>
              </Cell>
              <Cell labelHe="דוא״ל">
                <span className="text-xs" dir="ltr">
                  {user.email}
                </span>
              </Cell>
              <Cell labelHe="תפקידים">
                <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                  {user.roles.map((assignment) => (
                    <Badge key={assignment.roleId} tone="gold">
                      {ROLE_LABELS[assignment.role.name] ?? assignment.role.name}
                    </Badge>
                  ))}
                </span>
              </Cell>
              <Cell labelHe="סשנים">
                <span className="ltr-nums text-muted">{user.sessions.length}</span>
              </Cell>
              <Cell labelHe="נוצר">
                <span className="text-xs text-muted">{formatDateHe(user.createdAt)}</span>
              </Cell>
              <Cell labelHe="סטטוס">
                <Badge tone={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? 'פעיל' : 'מושבת'}
                </Badge>
              </Cell>
            </Row>
          ))}
        </Table>
      )}

      <div className="mt-8">
        <Card titleHe="הענקת תפקידים">
          <p className="text-sm leading-relaxed text-muted">
            שיוך תפקידים מהממשק טרם מומש. כרגע התפקידים מוקצים בזריעת בסיס הנתונים
            (<span dir="ltr">prisma/seed.ts</span>). כל שינוי הרשאות עתידי חייב להיכתב
            ליומן הפעולות ולהיות מוגבל ל־<span dir="ltr">SUPER_ADMIN</span> בלבד.
          </p>
        </Card>
      </div>
    </div>
  );
}
