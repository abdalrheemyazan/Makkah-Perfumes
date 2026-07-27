'use client';

import { useActionState, useState } from 'react';
import { saveCoupon, toggleCoupon } from '@/app/actions/admin/coupons';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { SubmitButton } from './form';

export type CouponDraft = {
  id: string | null;
  code: string;
  descriptionHe: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  /** Percent for PERCENTAGE, shekels for FIXED_AMOUNT. */
  discountValueDisplay: string;
  minSubtotalShekels: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const field =
  'mt-1.5 h-11 w-full rounded-sm border border-gold/25 bg-ink px-3 text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none';

export function CouponForm({ draft }: { draft: CouponDraft }) {
  const [state, formAction] = useActionState(saveCoupon, ADMIN_ACTION_INITIAL);
  const [discountType, setDiscountType] = useState(draft.discountType);

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-5">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}

      <div>
        <label className="block text-sm text-cream">קוד קופון</label>
        <input
          name="code"
          defaultValue={draft.code}
          dir="ltr"
          required
          maxLength={32}
          placeholder="WELCOME10"
          className={`${field} uppercase`}
        />
        <p className="mt-1 text-xs text-faint">אותיות לטיניות, ספרות, מקף או קו תחתון. יומר לאותיות גדולות.</p>
      </div>

      <div>
        <label className="block text-sm text-cream">שם/תיאור לניהול (רשות)</label>
        <input name="descriptionHe" defaultValue={draft.descriptionHe} maxLength={120} className={field} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-cream">סוג הנחה</label>
          <select
            name="discountType"
            defaultValue={draft.discountType}
            onChange={(e) => setDiscountType(e.target.value as CouponDraft['discountType'])}
            className={field}
          >
            <option value="PERCENTAGE">אחוז הנחה</option>
            <option value="FIXED_AMOUNT">סכום קבוע (₪)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-cream">
            {discountType === 'PERCENTAGE' ? 'אחוז (1–100)' : 'סכום בשקלים'}
          </label>
          <input
            name="discountValue"
            type="number"
            step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
            min="0"
            defaultValue={draft.discountValueDisplay}
            required
            dir="ltr"
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm text-cream">מינימום הזמנה (₪, רשות)</label>
          <input name="minSubtotalShekels" type="number" step="0.01" min="0" defaultValue={draft.minSubtotalShekels} dir="ltr" className={field} />
        </div>
        <div>
          <label className="block text-sm text-cream">מגבלת שימוש כוללת (רשות)</label>
          <input name="usageLimit" type="number" min="1" defaultValue={draft.usageLimit} dir="ltr" className={field} />
        </div>
        <div>
          <label className="block text-sm text-cream">מגבלה ללקוח (רשות)</label>
          <input name="perUserLimit" type="number" min="1" defaultValue={draft.perUserLimit} dir="ltr" className={field} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-cream">תאריך התחלה (רשות)</label>
          <input name="startsAt" type="date" defaultValue={draft.startsAt} dir="ltr" className={field} />
        </div>
        <div>
          <label className="block text-sm text-cream">תאריך סיום (רשות)</label>
          <input name="endsAt" type="date" defaultValue={draft.endsAt} dir="ltr" className={field} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-cream">
        <input type="checkbox" name="isActive" defaultChecked={draft.isActive} className="accent-gold" />
        קופון פעיל
      </label>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {state.messageHe}
        </p>
      )}
      {state.status === 'success' && <p className="text-sm text-success">{state.messageHe}</p>}

      <div>
        <SubmitButton labelHe="שמירת קופון" />
      </div>
    </form>
  );
}

/** Activate / deactivate toggle used in the list. */
export function CouponToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [, formAction] = useActionState(toggleCoupon, ADMIN_ACTION_INITIAL);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton labelHe={isActive ? 'השבתה' : 'הפעלה'} variant="secondary" />
    </form>
  );
}
