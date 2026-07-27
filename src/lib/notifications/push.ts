import 'server-only';
import webpush from 'web-push';
import { getVapidConfig } from './env';

/**
 * Web Push transport.
 *
 * Standards-based (RFC 8291/8292) delivery via the `web-push` library, which
 * signs the VAPID JWT and encrypts the payload. We never log the full endpoint
 * (it is a capability URL) — only its origin, for debugging.
 */

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  icon?: string;
  image?: string;
  tag?: string;
};

export type PushResult =
  | { ok: true }
  | { ok: false; expired: boolean; error: string };

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const vapid = getVapidConfig();
  if (!vapid) return false;
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  configured = true;
  return true;
}

/** Origin only — never log the full push endpoint, which is a secret capability URL. */
export function endpointOrigin(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return 'unknown';
  }
}

/**
 * Sends one push message. Returns `expired: true` for 404/410 responses so the
 * caller can prune a subscription the browser has revoked.
 */
export async function sendPush(
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<PushResult> {
  if (!ensureConfigured()) {
    return { ok: false, expired: false, error: 'push-not-configured' };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // deliver within a day or drop it
    );
    return { ok: true };
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : 0;
    const expired = statusCode === 404 || statusCode === 410;
    return {
      ok: false,
      expired,
      error: expired ? `gone-${statusCode}` : `push-failed-${statusCode || 'unknown'}`,
    };
  }
}
