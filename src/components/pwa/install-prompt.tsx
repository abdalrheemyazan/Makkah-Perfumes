'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * PWA install experience — intentionally quiet.
 *
 * Rules honoured:
 *  - never an on-load popup; the banner only appears once the browser fires
 *    `beforeinstallprompt` (or, on iOS, when the app is clearly installable),
 *    and after a short delay so it never interrupts first paint;
 *  - never shown when already installed (display-mode: standalone);
 *  - dismissible, and a dismissal is remembered for 30 days;
 *  - iOS gets manual "Add to Home Screen" guidance since it has no prompt API.
 */

const DISMISS_KEY = 'makkah-pwa-dismissed';
const DISMISS_DAYS = 30;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const when = Number(raw);
    if (!Number.isFinite(when)) return false;
    return Date.now() - when < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      // Small delay so it never competes with first paint.
      window.setTimeout(() => setVisible(true), 2500);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS has no beforeinstallprompt — offer manual guidance instead. Both
    // setStates run from the timer callback, not synchronously in the effect body.
    let iosTimer: number | undefined;
    if (isIos()) {
      iosTimer = window.setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 2500);
    }

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode — nothing to persist */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="התקנת האפליקציה"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(92%,26rem)] rounded-lg border border-gold/25 bg-charcoal/95 p-4 shadow-xl shadow-black/50 backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-sm text-ivory">התקנת Makkah Perfumes</p>
          <p className="mt-0.5 text-xs leading-relaxed text-cream/80">
            {showIosHint
              ? 'לחצו על שיתוף ולאחר מכן על "הוספה למסך הבית".'
              : 'התקינו את החנות לגישה מהירה יותר.'}
          </p>

          <div className="mt-3 flex items-center gap-3">
            {!showIosHint && deferred && (
              <button
                type="button"
                onClick={install}
                className="inline-flex h-9 items-center justify-center rounded-sm bg-gold px-4 text-xs font-medium text-ink hover:bg-cream"
              >
                התקנה
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-faint hover:text-cream"
            >
              לא עכשיו
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
