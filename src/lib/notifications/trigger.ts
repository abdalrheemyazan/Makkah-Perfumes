import 'server-only';
import { after } from 'next/server';
import { processRestockForVariant } from './restock';

/**
 * Schedules restock notification fan-out to run AFTER the current response is
 * flushed. An admin inventory edit or an order cancellation therefore returns
 * immediately and never waits on (potentially many) push/email sends.
 *
 * On Netlify's Next runtime `after()` runs in the same function invocation once
 * the response is sent — the "background-safe mechanism available in the current
 * architecture". The idempotent job endpoint (/api/restock/process) is the
 * retry/fallback path for anything a cold invocation drops. Processing is safe
 * to run more than once: NOTIFIED subscriptions are never re-sent.
 */
export function scheduleRestockNotifications(variantId: string): void {
  after(async () => {
    try {
      await processRestockForVariant(variantId);
    } catch (error) {
      console.error('[restock] fan-out failed for variant', variantId, error);
    }
  });
}
