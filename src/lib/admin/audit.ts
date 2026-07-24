import 'server-only';
import { db } from '@/lib/db';
import { clientIp } from '@/lib/rate-limit';

/**
 * Audit logging.
 *
 * Every admin mutation writes one row here. The `metadata` column holds a JSON
 * before/after diff so a change can be explained after the fact.
 *
 * Secrets, password hashes and payment details are never logged — `redact`
 * strips them defensively rather than trusting each call site to remember.
 */

const REDACTED_KEYS = [
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'secret',
  'apiKey',
  'cardNumber',
  'cvv',
];

function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (REDACTED_KEYS.some((needle) => key.toLowerCase().includes(needle.toLowerCase()))) {
      result[key] = '[redacted]';
    } else {
      result[key] = redact(entry);
    }
  }
  return result;
}

export async function logAudit(input: {
  userId: string | null;
  /** Dotted action id, e.g. "product.update", "inventory.adjust". */
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  note?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.before !== undefined) payload.before = redact(input.before);
  if (input.after !== undefined) payload.after = redact(input.after);
  if (input.note) payload.note = input.note;

  try {
    await db.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: Object.keys(payload).length > 0 ? JSON.stringify(payload) : null,
        ipAddress: await clientIp().catch(() => null),
      },
    });
  } catch (error) {
    // An audit write must never take down the mutation it describes.
    console.error('[audit] failed to record', input.action, error);
  }
}
