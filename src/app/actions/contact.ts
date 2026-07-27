'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { clientIp, limitByIp } from '@/lib/rate-limit';
import { sendContactNotification } from '@/lib/mail';
import { SITE } from '@/lib/site';
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

  // Honeypot: a hidden field real users never see. If a bot fills it, we drop the
  // submission without writing a row, and return the ordinary success state so the
  // bot gets no signal that it was blocked.
  const honeypot = String(formData.get('company') ?? '').trim();
  if (honeypot) {
    return {
      status: 'success',
      messageHe: 'הפנייה התקבלה בהצלחה. נחזור אליכם בהקדם.',
      errors: {},
    };
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
    const created = await db.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        userId: user?.id ?? null,
        ipAddress: ip,
      },
      select: { id: true },
    });

    // Best-effort admin alert. Never blocks or fails the request — the row is
    // already saved and visible in the admin regardless of email delivery.
    void sendContactNotification({
      name,
      subject,
      adminUrl: `${SITE.url}/admin/contact-requests/${created.id}`,
    }).catch((error) => console.error('[contact] admin notification failed', error));

    return {
      status: 'success',
      messageHe: 'הפנייה התקבלה בהצלחה. נחזור אליכם בהקדם.',
      errors: {},
    };
  } catch (error) {
    console.error('[contact] submit failed', error);
    return {
      status: 'error',
      messageHe: 'לא הצלחנו לשלוח את הפנייה כרגע. נסו שוב בעוד מספר רגעים.',
      errors: {},
    };
  }
}
