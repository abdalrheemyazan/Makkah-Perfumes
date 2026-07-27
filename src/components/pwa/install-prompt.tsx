'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  INSTALL_DISMISSED_AT_KEY,
  INSTALL_INSTALLED_KEY,
  INSTALL_SESSION_SHOWN_KEY,
  INSTALL_SHOW_DELAY_MS,
  isRouteExcluded,
  parseDismissedAt,
  shouldShowInstallBanner,
} from '@/lib/pwa-install';

/**
 * PWA install experience — intentionally quiet, and shown at most once per tab
 * session.
 *
 * The banner is mounted once from the persistent site layout, so it does not
 * remount on internal navigation. As a belt-and-suspenders guard against any
 * remount, a sessionStorage flag (`makkah-pwa-install-shown`) is written the
 * moment it appears, so it never reopens during the session. Dismissing it (or
 * Escape) hides it for one hour via a localStorage timestamp; installing it hides
 * it forever. All storage access is guarded and tolerant of private mode / bad
 * values, and a single `beforeinstallprompt` listener is registered.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function safeLocalGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function safeLocalSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    /* private mode — nothing to persist */
  }
}
function safeSessionGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function safeSessionSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isInstalledFlag(): boolean {
  return safeLocalGet(INSTALL_INSTALLED_KEY) === 'true';
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

/** Reads the current storage/route state and asks the pure guard. */
function eligibleNow(excluded: boolean): boolean {
  return shouldShowInstallBanner({
    installed: isInstalledFlag(),
    standalone: isStandalone(),
    excludedRoute: excluded,
    sessionShown: safeSessionGet(INSTALL_SESSION_SHOWN_KEY) === '1',
    dismissedAt: parseDismissedAt(safeLocalGet(INSTALL_DISMISSED_AT_KEY)),
  });
}

export function InstallPrompt() {
  const pathname = usePathname();
  const excluded = isRouteExcluded(pathname);

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  // Mirror the latest exclusion into a ref so the (once-registered) timer reads
  // the current route without re-arming on navigation.
  const excludedRef = useRef(excluded);
  useEffect(() => {
    excludedRef.current = excluded;
  }, [excluded]);

  // Register exactly one set of listeners for the component's lifetime.
  useEffect(() => {
    if (isInstalledFlag() || isStandalone()) return;

    let revealTimer: number | undefined;

    const reveal = (ios: boolean) => {
      if (revealTimer !== undefined) return; // a single scheduled reveal
      revealTimer = window.setTimeout(() => {
        revealTimer = undefined;
        if (!eligibleNow(excludedRef.current)) return;
        if (ios) setShowIosHint(true);
        setVisible(true);
        // Mark shown immediately, so navigation/remounts never reopen it.
        safeSessionSet(INSTALL_SESSION_SHOWN_KEY, '1');
      }, INSTALL_SHOW_DELAY_MS);
    };

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      if (eligibleNow(excludedRef.current)) reveal(false);
    };

    const onInstalled = () => {
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
      setVisible(false);
      setDeferred(null);
      safeLocalSet(INSTALL_INSTALLED_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS has no beforeinstallprompt — offer the manual hint on the same terms.
    if (isIos() && eligibleNow(excludedRef.current)) reveal(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    safeLocalSet(INSTALL_DISMISSED_AT_KEY, String(Date.now()));
  }

  // Escape closes the (non-modal) banner and counts as a one-hour dismissal.
  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  if (excluded || safeSessionGet(INSTALL_SESSION_SHOWN_KEY) === '1' || !visible) return null;

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
