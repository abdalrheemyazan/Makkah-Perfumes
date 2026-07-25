'use client';

import { useActionState } from 'react';
import { addMessageNote, updateMessageStatus } from '@/app/actions/admin/messages';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { SubmitButton } from './form';

export function MessageActions({
  id,
  status,
  note,
}: {
  id: string;
  status: string;
  note: string | null;
}) {
  const [statusState, statusAction] = useActionState(updateMessageStatus, ADMIN_ACTION_INITIAL);
  const [noteState, noteAction] = useActionState(addMessageNote, ADMIN_ACTION_INITIAL);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-gold/10 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {status !== 'READ' && status !== 'RESOLVED' && (
          <form action={statusAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="READ" />
            <SubmitButton labelHe="סימון כנקרא" variant="secondary" />
          </form>
        )}
        {status !== 'RESOLVED' && (
          <form action={statusAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="RESOLVED" />
            <SubmitButton labelHe="סימון כטופל" />
          </form>
        )}
        {status === 'RESOLVED' && (
          <form action={statusAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="NEW" />
            <SubmitButton labelHe="פתיחה מחדש" variant="secondary" />
          </form>
        )}
        {statusState.status === 'error' && (
          <p role="alert" className="text-xs text-danger">
            {statusState.messageHe}
          </p>
        )}
      </div>

      <form action={noteAction} className="flex flex-col gap-2">
        <label className="text-xs text-muted">
          הערה פנימית
          <textarea
            name="note"
            defaultValue={note ?? ''}
            rows={2}
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
