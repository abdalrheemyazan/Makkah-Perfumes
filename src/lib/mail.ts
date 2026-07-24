import 'server-only';
import { formatPrice } from '@/lib/commerce/money';
import { SITE } from '@/lib/site';

/**
 * Transactional email.
 *
 * No SMTP provider has been chosen yet (docs/MISSING_BUSINESS_DATA.md), so the
 * default transport prints the message to the server log. That keeps the
 * checkout pipeline honest end-to-end — the email is really composed and really
 * dispatched — without silently pretending a message was delivered.
 *
 * To enable real delivery: set MAIL_TRANSPORT=smtp plus SMTP_* in .env and
 * implement `smtpTransport` below. See docs/DEPLOYMENT.md.
 */

export type MailMessage = {
  to: string;
  subject: string;
  /** Hebrew plain-text body. */
  text: string;
};

async function consoleTransport(message: MailMessage): Promise<void> {
  console.info(
    ['', '─── MAIL (console transport) ───', `To: ${message.to}`, `Subject: ${message.subject}`, '', message.text, '────────────────────────────────', ''].join('\n'),
  );
}

async function send(message: MailMessage): Promise<void> {
  const transport = process.env.MAIL_TRANSPORT ?? 'console';

  switch (transport) {
    case 'console':
      return consoleTransport(message);
    default:
      throw new Error(
        `MAIL_TRANSPORT="${transport}" is not implemented. Add the transport in src/lib/mail.ts or set MAIL_TRANSPORT=console.`,
      );
  }
}

export async function sendOrderConfirmation(input: {
  to: string;
  orderNumber: string;
  totalAgorot: number;
  isDevelopmentOrder: boolean;
}): Promise<void> {
  const lines = [
    `תודה על הזמנתכם מ${SITE.nameHe}.`,
    '',
    `מספר הזמנה: ${input.orderNumber}`,
    `סכום לתשלום: ${formatPrice(input.totalAgorot)}`,
    '',
    'נעדכן אתכם כאשר ההזמנה תישלח.',
  ];

  if (input.isDevelopmentOrder) {
    lines.push(
      '',
      '⚠️ הזמנה זו נוצרה במצב פיתוח. לא בוצע חיוב אמיתי ולא יישלח משלוח.',
    );
  }

  await send({
    to: input.to,
    subject: `אישור הזמנה ${input.orderNumber} — ${SITE.nameHe}`,
    text: lines.join('\n'),
  });
}

export async function sendAdminOrderNotification(input: {
  orderNumber: string;
  totalAgorot: number;
}): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (!adminEmail) return;

  await send({
    to: adminEmail,
    subject: `הזמנה חדשה ${input.orderNumber}`,
    text: `התקבלה הזמנה חדשה ${input.orderNumber} בסך ${formatPrice(input.totalAgorot)}.`,
  });
}
