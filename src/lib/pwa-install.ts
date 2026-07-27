/**
 * Constants and pure helpers for the PWA install banner.
 *
 * Behavior (launch spec): the banner appears ONLY on the homepage, after a short
 * delay, and is fully ephemeral — dismissing it (or Escape) hides it for the
 * current homepage view only. Nothing is persisted except the installed flag, so
 * a refresh or a later return to the homepage makes it eligible again. There is
 * no sessionStorage flag and no timed dismissal.
 */

/** localStorage: 'true' once the app has been installed — then never show again. */
export const INSTALL_INSTALLED_KEY = 'makkah-pwa-installed';

/** Delay before the banner appears on the homepage, so it never fights first paint. */
export const INSTALL_SHOW_DELAY_MS = 3000;

/** The banner is only ever eligible on the homepage. */
export function isInstallHomepage(pathname: string): boolean {
  return pathname === '/';
}
