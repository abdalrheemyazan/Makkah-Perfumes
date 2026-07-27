'use client';

import { useActionState } from 'react';
import { addMessageNote, updateMessageStatus } from '@/app/actions/admin/messages';
import { ADMIN_ACTION_INITIAL, type AdminActionState } from '@/lib/action-state';
import { SubmitButton } from './form';

/** One status-change button, posting to the shared status action. */
function StatusButton({
  id,
  to,
  labelHe,
  action,
  variant = 'primary',
}: {
  id: string;
  to: string;
  labelHe: string;
  action: (formData: FormData) => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={to} />
      <SubmitButton labelHe={labelHe} variant={variant} />
    </form>
  );
}

/**
 * Status controls + internal note for one contact request. Every button posts to
 * the audited server action, which re-checks the capability. No destructive
 * delete — "archive" is reversible via "שחזור".
 */
export function ContactRequestActions({
  id,
  status,
  note,
}: {
  id: string;
  status: string;
  note: string | null;
}) {
  const [statusState, statusAction] = useActionState<AdminActionState, FormData>(
    updateMessageStatus,
    ADMIN_ACTION_INITIAL,
  );
  const [noteState, noteAction] = useActionState(addMessageNote, ADMIN_ACTION_INITIAL);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'NEW' && (
          <StatusButton id={id} to="IN_PROGRESS" labelHe="סימון כבטיפול" action={statusAction} />
        )}
        {(status === 'NEW' || status === 'IN_PROGRESS' || status === 'READ') && (
          <StatusButton id={id} to="RESOLVED" labelHe="סימון כטופלה" action={statusAction} />
        )}
        {status === 'RESOLVED' && (
          <StatusButton id={id} to="NEW" labelHe="פתיחה מחדש" action={statusAction} variant="secondary" />
        )}
        {status !== 'ARCHIVED' ? (
          <StatusButton id={id} to="ARCHIVED" labelHe="העברה לארכיון" action={statusAction} variant="secondary" />
        ) : (
          <StatusButton id={id} to="NEW" labelHe="שחזור מהארכיון" action={statusAction} variant="secondary" />
        )}
        {statusState.status === 'error' && (
          <p role="alert" className="text-xs text-danger">
            {statusState.messageHe}
          </p>
        )}
      </div>

      <form action={noteAction} className="flex flex-col gap-2 border-t border-gold/10 pt-4">
        <label className="text-xs text-muted">
          הערה פנימית (לצוות בלבד)
          <textarea
            name="note"
            defaultValue={note ?? ''}
            rows={3}
            maxLength={2000}
            className="mt-1 w-full rounded-sm border border-gold/25 bg-ink px-2.5 py-2 text-sm text-ivory focus:border-gold focus:outline-none"
          />
        </label>
        <input type="hidden" name="id" value={id} />
        <div className="flex items-center gap-2">
          <SubmitButton labelHe="שמירת הערה" variant="secondary" />
          {noteState.status === 'success' && (
            <span className="text-xs text-success">{noteState.messageHe}</span>
          )}
        </div>
      </form>
    </div>
  );
}
