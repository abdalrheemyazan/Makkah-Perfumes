'use client';

import { useActionState } from 'react';
import { duplicateProduct, setProductStatus } from '@/app/actions/admin/products';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { FormAlert, SubmitButton } from './form';

/** Publish / archive / restore / duplicate, each as its own audited action. */
export function ProductStatusActions({
  productId,
  status,
}: {
  productId: string;
  status: string;
}) {
  const [statusState, statusAction] = useActionState(setProductStatus, ADMIN_ACTION_INITIAL);
  const [dupState, dupAction] = useActionState(duplicateProduct, ADMIN_ACTION_INITIAL);

  return (
    <div className="flex flex-col gap-3">
      <FormAlert status={statusState.status} messageHe={statusState.messageHe} />
      <FormAlert status={dupState.status} messageHe={dupState.messageHe} />

      {status !== 'PUBLISHED' && (
        <form action={statusAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="status" value="PUBLISHED" />
          <SubmitButton labelHe="פרסום המוצר" className="w-full" />
        </form>
      )}

      {status === 'PUBLISHED' && (
        <form action={statusAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="status" value="DRAFT" />
          <SubmitButton labelHe="החזרה לטיוטה" variant="secondary" className="w-full" />
        </form>
      )}

      {status !== 'ARCHIVED' ? (
        <form action={statusAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="status" value="ARCHIVED" />
          <SubmitButton
            labelHe="העברה לארכיון"
            variant="danger"
            className="w-full"
            confirmHe="להעביר את המוצר לארכיון? הוא יוסר מהחנות אך יישמר במערכת."
          />
        </form>
      ) : (
        <form action={statusAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="status" value="DRAFT" />
          <SubmitButton labelHe="שחזור מהארכיון" variant="secondary" className="w-full" />
        </form>
      )}

      <form action={dupAction}>
        <input type="hidden" name="productId" value={productId} />
        <SubmitButton
          labelHe="שכפול המוצר"
          variant="secondary"
          className="w-full"
          confirmHe="לשכפל את המוצר? העותק ייווצר כטיוטה ללא מלאי."
        />
      </form>
    </div>
  );
}
