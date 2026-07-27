'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { subscribeRestock, unsubscribeRestock } from '@/app/actions/restock';
import { RESTOCK_INITIAL } from '@/lib/action-state';
import { usePushSupported } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * "Notify me when it's back in stock."
 *
 * Replaces add-to-cart for an out-of-stock product. The panel is opened by an
 * explicit click — never a popup on load — and browser push permission is only
 * requested after a second explicit click, with email always available as a
 * fallback. Denied permission degrades gracefully and is not re-prompted.
 */

type Props = {
  productId: string;
  variantId: string | null;
  isLoggedIn: boolean;
  accountEmail: string | null;
  emailAvailable: boolean;
  vapidPublicKey: string | null;
  alreadySubscribed?: boolean;
  compact?: boolean;
  className?: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function RestockNotify({
  productId,
  variantId,
  isLoggedIn,
  accountEmail,
  emailAvailable,
  vapidPublicKey,
  alreadySubscribed = false,
  compact = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(subscribeRestock, RESTOCK_INITIAL);
  const [manuallyUnsubscribed, setManuallyUnsubscribed] = useState(false);
  // Derived, not mirrored in an effect: "already subscribed" is true when the
  // server said so or the action reported a duplicate, unless the customer has
  // just unsubscribed in this session.
  const showAlready =
    !manuallyUnsubscribed &&
    state.status !== 'success' &&
    (alreadySubscribed || state.status === 'already');

  // Push state — support is read from the browser without mirroring it in state.
  const pushSupported = usePushSupported() && Boolean(vapidPublicKey);
  const [pushJson, setPushJson] = useState<string>('');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const pushEnabled = pushJson !== '';

  const [wantsEmail, setWantsEmail] = useState(true);
  const [email, setEmail] = useState('');
  const [unsubPending, startUnsub] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const buttonLabel = compact
    ? 'עדכנו אותי כשיחזור'
    : 'עדכנו אותי כשהמוצר חוזר למלאי';

  async function enablePush() {
    if (!vapidPublicKey) return;
    setPushError(null);
    setPushBusy(true);
    try {
      if (Notification.permission === 'denied') {
        setPushError('התראות הדפדפן חסומות. ניתן לקבל עדכון באימייל.');
        return;
      }
      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushError('לא ניתנה הרשאה להתראות. ניתן לקבל עדכון באימייל.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      setPushJson(JSON.stringify(subscription.toJSON()));
    } catch {
      setPushError('הפעלת ההתראות נכשלה. ניתן לקבל עדכון באימייל.');
    } finally {
      setPushBusy(false);
    }
  }

  if (showAlready) {
    return (
      <div className={className}>
        <p className="text-sm text-cream" role="status">
          כבר ביקשתם לקבל עדכון עבור המוצר הזה.
        </p>
        <form
          action={(fd) => {
            fd.set('productId', productId);
            startUnsub(async () => {
              await unsubscribeRestock(RESTOCK_INITIAL, fd);
              setManuallyUnsubscribed(true);
            });
          }}
        >
          <button
            type="submit"
            disabled={unsubPending}
            className="mt-1 text-xs text-faint underline underline-offset-2 hover:text-cream disabled:opacity-60"
          >
            {unsubPending ? 'מבטל…' : 'ביטול העדכון'}
          </button>
        </form>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <p className={cn('text-sm text-success', className)} role="status" aria-live="polite">
        נרשמתם בהצלחה. נעדכן אתכם כשהמוצר יחזור למלאי.
      </p>
    );
  }

  if (!open) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex w-full items-center justify-center rounded-sm border border-gold/50 font-medium text-gold transition-colors duration-200 hover:bg-gold hover:text-ink',
            compact ? 'h-9 px-3 text-xs' : 'h-11 px-5 text-sm',
          )}
        >
          {buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-sm border border-gold/20 bg-charcoal p-4', className)}>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantId" value={variantId ?? ''} />
        <input type="hidden" name="wantsEmail" value={wantsEmail ? 'on' : ''} />
        <input type="hidden" name="wantsPush" value={pushEnabled ? 'on' : ''} />
        <input type="hidden" name="pushSubscription" value={pushJson} />

        <p className="text-sm text-cream">קבלת עדכון כשהמוצר חוזר למלאי</p>

        {/* Email channel */}
        <label className="flex items-center gap-2 text-sm text-cream/90">
          <input
            type="checkbox"
            checked={wantsEmail}
            onChange={(e) => setWantsEmail(e.target.checked)}
            className="accent-gold"
          />
          עדכון באימייל
        </label>

        {wantsEmail && isLoggedIn && accountEmail ? (
          <p className="ltr-nums text-xs text-faint" dir="ltr">
            {accountEmail}
          </p>
        ) : wantsEmail ? (
          <>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={wantsEmail && !pushEnabled}
              placeholder="כתובת דוא״ל"
              dir="ltr"
              className="h-10 rounded-sm border border-gold/20 bg-ink px-3 text-sm text-ivory placeholder:text-faint"
            />
            <p className="text-[0.7rem] leading-relaxed text-faint">
              נשתמש בכתובת אך ורק כדי לעדכן אתכם על חזרת המוצר למלאי. ניתן לבטל בכל עת.
            </p>
          </>
        ) : null}

        {!emailAvailable && wantsEmail && (
          <p className="text-[0.7rem] text-faint">
            שליחת אימייל אינה זמינה כרגע; נשמור את הבקשה ונעדכן ברגע שהשירות יופעל.
          </p>
        )}

        {/* Push channel — only after explicit action */}
        {pushSupported && (
          <div className="flex flex-col gap-1">
            {pushEnabled ? (
              <p className="text-xs text-success">התראות דפדפן מופעלות ✓</p>
            ) : (
              <button
                type="button"
                onClick={enablePush}
                disabled={pushBusy}
                className="self-start rounded-sm border border-gold/30 px-3 py-1.5 text-xs text-gold hover:bg-gold/10 disabled:opacity-60"
              >
                {pushBusy ? 'מפעיל…' : 'קבלת התראה בדפדפן'}
              </button>
            )}
            {pushError && <p className="text-[0.7rem] text-danger">{pushError}</p>}
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-xs text-danger" role="alert">
            {state.messageHe}
          </p>
        )}
        {state.status === 'already' && (
          <p className="text-xs text-cream" role="status">
            כבר ביקשתם לקבל עדכון עבור המוצר הזה.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || (!wantsEmail && !pushEnabled)}
            className="inline-flex h-10 items-center justify-center rounded-sm bg-gold px-5 text-sm font-medium text-ink hover:bg-cream disabled:opacity-60"
          >
            {pending ? 'רושם…' : 'הרשמה לעדכון'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-faint hover:text-cream"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
