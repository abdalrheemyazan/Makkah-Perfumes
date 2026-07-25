'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireCapability } from '@/lib/auth';
import { logAudit } from '@/lib/admin/audit';
import type { AdminActionState } from '@/lib/action-state';

/**
 * Contact-message moderation. Support agents and admins may read messages and
 * change their status / add an internal note. Every change is audited. The
 * capability is re-checked here on the server — hiding the sidebar link is not
 * access control.
 */

const STATUSES = ['NEW', 'READ', 'RESOLVED'] as const;
type Status = (typeof STATUSES)[number];

export async function updateMessageStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('messages.read');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');

  if (!STATUSES.includes(status as Status)) {
    return { status: 'error', messageHe: 'סטטוס לא תקין.', errors: {} };
  }

  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) return { status: 'error', messageHe: 'הפנייה לא נמצאה.', errors: {} };

  await db.contactMessage.update({ where: { id }, data: { status: status as Status } });

  await logAudit({
    userId: user.id,
    action: 'message.status',
    entityType: 'ContactMessage',
    entityId: id,
    before: { status: message.status },
    after: { status },
  });

  revalidatePath('/admin/messages');
  return { status: 'success', messageHe: 'הפנייה עודכנה.', errors: {} };
}

export async function addMessageNote(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('messages.read');
  const id = String(formData.get('id') ?? '');
  const note = String(formData.get('note') ?? '').trim().slice(0, 2000);

  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) return { status: 'error', messageHe: 'הפנייה לא נמצאה.', errors: {} };

  await db.contactMessage.update({
    where: { id },
    data: { adminNote: note || null },
  });

  await logAudit({
    userId: user.id,
    action: 'message.note',
    entityType: 'ContactMessage',
    entityId: id,
  });

  revalidatePath('/admin/messages');
  return { status: 'success', messageHe: 'ההערה נשמרה.', errors: {} };
}
