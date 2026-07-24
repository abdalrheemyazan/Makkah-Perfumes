'use client';

import { useActionState } from 'react';
import { moderateReview } from '@/app/actions/admin/operations';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { SubmitButton } from './form';

export function ReviewModerationForm({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const [state, formAction] = useActionState(moderateReview, ADMIN_ACTION_INITIAL);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'APPROVED' && (
        <form action={formAction}>
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="status" value="APPROVED" />
          <SubmitButton labelHe="אישור לפרסום" />
        </form>
      )}
      {status !== 'REJECTED' && (
        <form action={formAction}>
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="status" value="REJECTED" />
          <SubmitButton labelHe="דחייה" variant="danger" />
        </form>
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-xs text-danger">
          {state.messageHe}
        </p>
      )}
    </div>
  );
}
