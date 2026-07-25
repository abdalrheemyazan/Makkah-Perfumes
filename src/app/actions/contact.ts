'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { clientIp, limitByIp } from '@/lib/rate-limit';
import { contactSchema, fieldErrors } from '@/lib/validation';
import type { ContactState } from '@/lib/action-state';

/**
 * Contact form submission.
 *
 * Persists the message to the database so it appears in the admin inbox
 * (/admin/messages). Never reports success unless the row was actually written.
 * Rate-limited by IP, and linked to the customer's account when signed in.
 */
export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const limit = await limitByIp('contact', { limit: 5, windowSeconds: 600 });
  if (!limit.ok) {
    return { status: 'error', messageHe: limit.errorHe, errors: {} };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    subject: formData.get('subject'),
    message: formData.get('message'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      messageHe: 'לא הצלחנו לשלוח את הפנייה. בדקו את הפרטים ונסו שוב.',
      errors: fieldErrors(parsed.error),
    };
  }

  const { name, email, phone, subject, message } = parsed.data;

  try {
    const [user, ip] = await Promise.all([getCurrentUser(), clientIp()]);
    await db.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        userId: user?.id ?? null,
        ipAddress: ip,
      },
    });

    return {
      status: 'success',
      messageHe: 'תודה! הפנייה נשלחה. נחזור אליכם בהקדם.',
      errors: {},
    };
  } catch (error) {
    console.error('[contact] submit failed', error);
    return {
      status: 'error',
      messageHe: 'אירעה תקלה בשליחת הפנייה. נסו שוב מאוחר יותר.',
      errors: {},
    };
  }
}
