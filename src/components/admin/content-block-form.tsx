'use client';

import { useActionState } from 'react';
import { updateContentBlock } from '@/app/actions/admin/content';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { CheckboxField, FormAlert, SubmitButton, TextArea, TextField } from './form';

export type ContentBlockValues = {
  key: string;
  kind: string;
  titleHe: string;
  bodyHe: string;
  ctaLabelHe: string;
  ctaHref: string;
  mediaUrl: string;
  posterUrl: string;
  mobileUrl: string;
  isPublished: boolean;
};

export function ContentBlockForm({
  block,
  showMedia,
}: {
  block: ContentBlockValues;
  showMedia?: boolean;
}) {
  const [state, formAction] = useActionState(updateContentBlock, ADMIN_ACTION_INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="key" value={block.key} />
      <FormAlert status={state.status} messageHe={state.messageHe} />

      <TextField name="titleHe" labelHe="כותרת" defaultValue={block.titleHe} />
      <TextArea name="bodyHe" labelHe="טקסט" defaultValue={block.bodyHe} rows={4} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="ctaLabelHe" labelHe="טקסט כפתור" defaultValue={block.ctaLabelHe} />
        <TextField name="ctaHref" labelHe="קישור כפתור" defaultValue={block.ctaHref} dir="ltr" />
      </div>

      {showMedia && (
        <div className="grid gap-4 border-t border-gold/10 pt-4 sm:grid-cols-3">
          <TextField
            name="mediaUrl"
            labelHe="מדיה ראשית"
            defaultValue={block.mediaUrl}
            dir="ltr"
            error={state.errors.mediaUrl}
            hintHe="נתיב בתוך האתר, למשל /generated/cinematic/hero-stage.webp"
          />
          <TextField
            name="posterUrl"
            labelHe="פוסטר / תנועה מופחתת"
            defaultValue={block.posterUrl}
            dir="ltr"
            error={state.errors.posterUrl}
          />
          <TextField
            name="mobileUrl"
            labelHe="גרסת מובייל"
            defaultValue={block.mobileUrl}
            dir="ltr"
            error={state.errors.mobileUrl}
          />
        </div>
      )}

      <CheckboxField name="isPublished" labelHe="מוצג באתר" defaultChecked={block.isPublished} />

      <div>
        <SubmitButton labelHe="שמירה" />
      </div>
    </form>
  );
}
