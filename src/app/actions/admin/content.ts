'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireCapability } from '@/lib/auth';
import { logAudit } from '@/lib/admin/audit';
import type { AdminActionState } from '@/lib/action-state';

/** Content-block and site-setting mutations. */

const blockSchema = z.object({
  key: z.string().min(1),
  titleHe: z.string().trim().max(200).optional().or(z.literal('')),
  bodyHe: z.string().trim().max(6000).optional().or(z.literal('')),
  ctaLabelHe: z.string().trim().max(60).optional().or(z.literal('')),
  ctaHref: z.string().trim().max(300).optional().or(z.literal('')),
  mediaUrl: z.string().trim().max(400).optional().or(z.literal('')),
  posterUrl: z.string().trim().max(400).optional().or(z.literal('')),
  mobileUrl: z.string().trim().max(400).optional().or(z.literal('')),
  isPublished: z.coerce.boolean().optional().default(true),
});

/** Media paths must stay inside /public — never an arbitrary remote URL. */
function safeMediaPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.includes('..')) return null;
  return trimmed;
}

export async function updateContentBlock(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('content.write');

  const parsed = blockSchema.safeParse({
    key: formData.get('key'),
    titleHe: formData.get('titleHe') ?? '',
    bodyHe: formData.get('bodyHe') ?? '',
    ctaLabelHe: formData.get('ctaLabelHe') ?? '',
    ctaHref: formData.get('ctaHref') ?? '',
    mediaUrl: formData.get('mediaUrl') ?? '',
    posterUrl: formData.get('posterUrl') ?? '',
    mobileUrl: formData.get('mobileUrl') ?? '',
    isPublished: formData.get('isPublished') === 'on',
  });

  if (!parsed.success) {
    return { status: 'error', messageHe: 'הנתונים אינם תקינים.', errors: {} };
  }
  const data = parsed.data;

  for (const [field, value] of [
    ['mediaUrl', data.mediaUrl],
    ['posterUrl', data.posterUrl],
    ['mobileUrl', data.mobileUrl],
  ] as const) {
    if (value && !safeMediaPath(value)) {
      return {
        status: 'error',
        messageHe: 'נתיב מדיה חייב להתחיל ב־/ ולהצביע לקובץ בתוך האתר.',
        errors: { [field]: 'נתיב לא תקין' },
      };
    }
  }

  const before = await db.contentBlock.findUnique({ where: { key: data.key } });
  if (!before) return { status: 'error', messageHe: 'הבלוק לא נמצא.', errors: {} };

  await db.contentBlock.update({
    where: { key: data.key },
    data: {
      titleHe: data.titleHe || null,
      bodyHe: data.bodyHe || null,
      ctaLabelHe: data.ctaLabelHe || null,
      ctaHref: data.ctaHref || null,
      mediaUrl: data.mediaUrl ? safeMediaPath(data.mediaUrl) : null,
      posterUrl: data.posterUrl ? safeMediaPath(data.posterUrl) : null,
      mobileUrl: data.mobileUrl ? safeMediaPath(data.mobileUrl) : null,
      isPublished: data.isPublished,
    },
  });

  await logAudit({
    userId: user.id,
    action: 'content.update',
    entityType: 'ContentBlock',
    entityId: data.key,
    before: { titleHe: before.titleHe, isPublished: before.isPublished },
    after: { titleHe: data.titleHe, isPublished: data.isPublished },
  });

  revalidatePath('/admin/content');
  revalidatePath('/', 'layout');

  return { status: 'success', messageHe: 'התוכן נשמר.', errors: {} };
}

export async function updateSiteSetting(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('settings.write');

  const key = String(formData.get('key') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  if (!key) return { status: 'error', messageHe: 'בקשה לא תקינה.', errors: {} };

  const before = await db.siteSetting.findUnique({ where: { key } });

  await db.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await logAudit({
    userId: user.id,
    action: 'setting.update',
    entityType: 'SiteSetting',
    entityId: key,
    before: { value: before?.value },
    after: { value },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');

  return { status: 'success', messageHe: 'ההגדרה נשמרה.', errors: {} };
}
