'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireCapability } from '@/lib/auth';
import { logAudit } from '@/lib/admin/audit';
import type { AdminActionState } from '@/lib/action-state';

/**
 * Contact-request handling. Support agents and admins may read requests and
 * change their status / add an internal note. Every change is audited. The
 * capability is re-checked here on the server — hiding the sidebar link is not
 * access control.
 */

const STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const;
type Status = (typeof STATUSES)[number];

// Statuses that represent active handling — they stamp who handled it and when.
const HANDLED_STATUSES = new Set<Status>(['IN_PROGRESS', 'RESOLVED', 'ARCHIVED']);

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

  const nextStatus = status as Status;
  await db.contactMessage.update({
    where: { id },
    data: {
      status: nextStatus,
      handledAt: HANDLED_STATUSES.has(nextStatus) ? new Date() : message.handledAt,
      handledByUserId: HANDLED_STATUSES.has(nextStatus) ? user.id : message.handledByUserId,
    },
  });

  await logAudit({
    userId: user.id,
    action: 'message.status',
    entityType: 'ContactMessage',
    entityId: id,
    before: { status: message.status },
    after: { status: nextStatus },
  });

  revalidatePath('/admin/contact-requests');
  revalidatePath(`/admin/contact-requests/${id}`);
  revalidatePath('/admin');
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

  revalidatePath(`/admin/contact-requests/${id}`);
  return { status: 'success', messageHe: 'ההערה נשמרה.', errors: {} };
}
