import 'server-only';
import {
  emailDeliveryAvailable,
  pushDeliveryAvailable,
  publicVapidKey,
} from './config';

/**
 * Server-only notification config. The VAPID *private* key is read here and
 * never leaves the server. Public/boolean readers live in ./config so they can
 * also be used by server-rendered product cards.
 */

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/** Returns the VAPID config only when all three values are present. */
export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return pushDeliveryAvailable();
}

export function isEmailDeliveryConfigured(): boolean {
  return emailDeliveryAvailable();
}

/** The set of notification channels currently available to offer a customer. */
export function availableChannels(): { email: boolean; push: boolean } {
  return { email: emailDeliveryAvailable(), push: pushDeliveryAvailable() };
}

export { publicVapidKey };
