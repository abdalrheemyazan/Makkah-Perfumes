'use client';

import { useActionState } from 'react';
import {
  addOrderNote,
  cancelOrder,
  refundOrder,
  updateFulfillment,
  updateOrderStatus,
} from '@/app/actions/admin/operations';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import {
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from '@/lib/commerce/labels';
import { FormAlert, SelectField, SubmitButton, TextArea } from './form';

export function OrderStatusForm({
  orderId,
  status,
  fulfillmentStatus,
}: {
  orderId: string;
  status: string;
  fulfillmentStatus: string;
}) {
  const [statusState, statusAction] = useActionState(updateOrderStatus, ADMIN_ACTION_INITIAL);
  const [fulfilState, fulfilAction] = useActionState(updateFulfillment, ADMIN_ACTION_INITIAL);

  return (
    <div className="flex flex-col gap-6">
      <form action={statusAction} className="flex flex-col gap-3">
        <input type="hidden" name="orderId" value={orderId} />
        <FormAlert status={statusState.status} messageHe={statusState.messageHe} />
        <SelectField
          name="status"
          labelHe="סטטוס הזמנה"
          defaultValue={status}
          options={Object.entries(ORDER_STATUS_LABELS).map(([value, labelHe]) => ({
            value,
            labelHe,
          }))}
        />
        <SubmitButton labelHe="עדכון סטטוס" variant="secondary" />
      </form>

      <form action={fulfilAction} className="flex flex-col gap-3 border-t border-gold/10 pt-5">
        <input type="hidden" name="orderId" value={orderId} />
        <FormAlert status={fulfilState.status} messageHe={fulfilState.messageHe} />
        <SelectField
          name="fulfillmentStatus"
          labelHe="סטטוס אספקה"
          defaultValue={fulfillmentStatus}
          options={Object.entries(FULFILLMENT_STATUS_LABELS).map(([value, labelHe]) => ({
            value,
            labelHe,
          }))}
          hintHe="סימון „נשלח” מוריד את המלאי המשוריין בפועל"
        />
        <SubmitButton labelHe="עדכון אספקה" variant="secondary" />
      </form>
    </div>
  );
}

export function OrderDangerZone({
  orderId,
  canCancel,
  canRefund,
  isDevelopmentOrder,
}: {
  orderId: string;
  canCancel: boolean;
  canRefund: boolean;
  isDevelopmentOrder: boolean;
}) {
  const [cancelState, cancelAction] = useActionState(cancelOrder, ADMIN_ACTION_INITIAL);
  const [refundState, refundAction] = useActionState(refundOrder, ADMIN_ACTION_INITIAL);

  return (
    <div className="flex flex-col gap-5">
      <FormAlert status={cancelState.status} messageHe={cancelState.messageHe} />
      <FormAlert status={refundState.status} messageHe={refundState.messageHe} />

      {canCancel && (
        <form action={cancelAction} className="flex flex-col gap-3">
          <input type="hidden" name="orderId" value={orderId} />
          <TextArea name="reason" labelHe="סיבת ביטול" rows={2} />
          <SubmitButton
            labelHe="ביטול הזמנה"
            variant="danger"
            confirmHe="לבטל את ההזמנה? המלאי המשוריין ישוחרר."
          />
        </form>
      )}

      {canRefund && (
        <form action={refundAction} className="border-t border-gold/10 pt-5">
          <input type="hidden" name="orderId" value={orderId} />
          <SubmitButton
            labelHe="ביצוע החזר"
            variant="danger"
            confirmHe={
              isDevelopmentOrder
                ? 'לבצע החזר? במצב פיתוח לא יוחזר כסף אמיתי.'
                : 'לבצע החזר תשלום מלא?'
            }
          />
          {isDevelopmentOrder && (
            <p className="mt-2 text-xs text-warning">
              מצב פיתוח — ההחזר יירשם במערכת אך לא יוחזר כסף אמיתי.
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export function OrderNoteForm({
  orderId,
  internalNote,
}: {
  orderId: string;
  internalNote: string;
}) {
  const [state, formAction] = useActionState(addOrderNote, ADMIN_ACTION_INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <FormAlert status={state.status} messageHe={state.messageHe} />
      <TextArea
        name="internalNote"
        labelHe="הערה פנימית"
        defaultValue={internalNote}
        rows={3}
        hintHe="נראית לצוות בלבד, לא ללקוח"
      />
      <SubmitButton labelHe="שמירת הערה" variant="secondary" />
    </form>
  );
}
