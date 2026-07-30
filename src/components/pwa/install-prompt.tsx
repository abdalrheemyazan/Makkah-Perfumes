'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { INSTALL_INSTALLED_KEY, INSTALL_SHOW_DELAY_MS, isInstallHomepage } from '@/lib/pwa-install';

/**
 * PWA install banner — homepage only, ephemeral.
 *
 * Mounted once from the persistent site layout, so it never remounts on
 * navigation. It appears only on `/`, ~3s after arriving. Dismissing it ("לא
 * עכשיו" / Escape) hides it for the current homepage view only — nothing is
 * persisted, so a refresh or a later return to the homepage may show it again.
 * The single exception is installation: once installed (or running standalone)
 * it never shows. One `beforeinstallprompt` listener is registered.
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

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isInstalled(): boolean {
  return safeLocalGet(INSTALL_INSTALLED_KEY) === 'true' || isStandalone();
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const pathname = usePathname();
  const onHomepage = isInstallHomepage(pathname);

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Register the one-and-only install listeners for the component's lifetime.
  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      safeLocalSet(INSTALL_INSTALLED_KEY, 'true');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // On the homepage, arm a one-shot reveal after the delay. Leaving the homepage
  // (effect cleanup) resets the ephemeral state so a later return starts fresh.
  useEffect(() => {
    if (!onHomepage || isInstalled()) return;
    const timer = window.setTimeout(() => {
      if (!isInstalled()) setVisible(true);
    }, INSTALL_SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setVisible(false);
      setDismissed(false);
    };
  }, [onHomepage]);

  function dismiss() {
    // Ephemeral: hide for this homepage view only. Nothing is persisted.
    setVisible(false);
    setDismissed(true);
  }

  // Escape closes the (non-modal) banner for the current view.
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

  const iosEligible = typeof navigator !== 'undefined' && isIos();
  if (!onHomepage || !visible || dismissed || isInstalled()) return null;
  // Non-iOS needs a captured prompt to be installable; iOS shows the manual hint.
  if (!deferred && !iosEligible) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="התקנת האפליקציה"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(92%,26rem)] rounded-lg border border-gold/25 bg-charcoal/95 p-4 shadow-xl shadow-black/50 backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <Image src="/icons/icon-192.png?v=20260730" alt="" width={44} height={44} className="rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-sm text-ivory">התקנת Makkah Perfumes</p>
          <p className="mt-0.5 text-xs leading-relaxed text-cream/80">
            {deferred ? 'התקינו את החנות לגישה מהירה יותר.' : 'לחצו על שיתוף ולאחר מכן על "הוספה למסך הבית".'}
          </p>

          <div className="mt-3 flex items-center gap-3">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="inline-flex h-9 items-center justify-center rounded-sm bg-gold px-4 text-xs font-medium text-ink hover:bg-cream"
              >
                התקנה
              </button>
            )}
            <button type="button" onClick={dismiss} className="text-xs text-faint hover:text-cream">
              לא עכשיו
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
