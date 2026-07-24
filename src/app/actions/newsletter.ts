'use server';

import { db } from '@/lib/db';
import { clientIp, limitByIp } from '@/lib/rate-limit';
import { fieldErrors, newsletterSchema } from '@/lib/validation';
import type { NewsletterState } from '@/lib/action-state';

export async function subscribeToNewsletter(
  _previous: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const limit = await limitByIp('newsletter', { limit: 5, windowSeconds: 600 });
  if (!limit.ok) {
    return { status: 'error', messageHe: limit.errorHe, errors: {} };
  }

  const parsed = newsletterSchema.safeParse({
    email: formData.get('email'),
    consent: formData.get('consent') ?? false,
  });

  if (!parsed.success) {
    return {
      status: 'error',
      messageHe: 'לא הצלחנו לאמת את הפרטים.',
      errors: fieldErrors(parsed.error),
    };
  }

  const { email } = parsed.data;

  try {
    const existing = await db.newsletterSubscriber.findUnique({ where: { email } });

    if (existing && !existing.unsubscribedAt) {
      // Do not leak whether an address is already on the list beyond a neutral message.
      return {
        status: 'success',
        messageHe: 'תודה! הכתובת רשומה לדיוור.',
        errors: {},
      };
    }

    const ip = await clientIp();
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: { consentedAt: new Date(), unsubscribedAt: null, ipAddress: ip },
      create: {
        email,
        consentedAt: new Date(),
        consentSource: 'footer-form',
        ipAddress: ip,
      },
    });

    return { status: 'success', messageHe: 'תודה! נעדכן אתכם בהשקות הבאות.', errors: {} };
  } catch (error) {
    console.error('[newsletter] subscribe failed', error);
    return {
      status: 'error',
      messageHe: 'אירעה תקלה. נסו שוב מאוחר יותר.',
      errors: {},
    };
  }
}
