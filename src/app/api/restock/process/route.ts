import { NextResponse, type NextRequest } from 'next/server';
import { processAllPendingRestocks } from '@/lib/notifications/restock';

/**
 * Idempotent restock notification job.
 *
 * This is the retry / fallback path for the `after()` fan-out in the admin
 * actions: it scans every ACTIVE subscription and notifies those whose product
 * is now available. Running it twice is harmless — NOTIFIED rows are skipped.
 *
 * Protected by a shared secret (RESTOCK_JOB_SECRET) so only a trusted caller
 * (a Netlify scheduled function, a cron, or an operator) can invoke it. When the
 * secret is unset the endpoint is disabled, never open.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = process.env.RESTOCK_JOB_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const provided =
    request.headers.get('x-restock-job-secret') ??
    new URL(request.url).searchParams.get('secret');

  if (provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const summary = await processAllPendingRestocks();
  return NextResponse.json({ ok: true, ...summary });
}
