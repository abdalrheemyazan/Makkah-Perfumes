'use client';

import { useActionState } from 'react';
import { updateSiteSetting } from '@/app/actions/admin/content';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { SubmitButton, TextField } from './form';

export function SiteSettingForm({
  settingKey,
  labelHe,
  value,
}: {
  settingKey: string;
  labelHe: string;
  value: string;
}) {
  const [state, formAction] = useActionState(updateSiteSetting, ADMIN_ACTION_INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="key" value={settingKey} />
      <div className="flex items-end gap-2">
        <TextField
          name="value"
          labelHe={labelHe}
          defaultValue={value}
          className="flex-1"
          placeholder="טרם הוזן"
        />
        <SubmitButton labelHe="שמירה" variant="secondary" />
      </div>
      {state.status !== 'idle' && state.messageHe && (
        <p
          role="status"
          className={`text-xs ${state.status === 'error' ? 'text-danger' : 'text-success'}`}
        >
          {state.messageHe}
        </p>
      )}
    </form>
  );
}
