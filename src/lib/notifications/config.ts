/**
 * Channel-availability readers, safe to import from any server component.
 *
 * Deliberately NOT `server-only`: these are used by `ProductCard`, which renders
 * in both cached and dynamic server contexts. They only ever return the *public*
 * VAPID key or plain booleans — never a secret. On the client the private/mail
 * env vars are simply `undefined`, so the booleans read `false`; nothing leaks.
 */

/** The public VAPID key, or null when push is not configured. Public by design. */
export function publicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

/** True only when the full VAPID triple is present, so a push can be delivered. */
export function pushDeliveryAvailable(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

/**
 * Whether email can actually be delivered now. The default `console` transport
 * is a genuine dev preview but must not be presented as delivery in production.
 */
export function emailDeliveryAvailable(): boolean {
  const transport = process.env.MAIL_TRANSPORT ?? 'console';
  if (transport === 'console') return process.env.NODE_ENV !== 'production';
  return true;
}
