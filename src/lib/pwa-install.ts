/**
 * Pure decision logic and storage keys for the PWA install banner.
 *
 * Kept free of React and browser globals so it can be unit-tested directly and
 * shared by the client component. The component owns all DOM/storage access;
 * this module only decides, given plain values, whether the banner may appear.
 */

/** Dismissing ("לא עכשיו" / Escape) hides the banner for exactly one hour. */
export const INSTALL_DISMISS_DURATION_MS = 60 * 60 * 1000;

/** Delay before the banner appears on an eligible page, so it never fights first paint. */
export const INSTALL_SHOW_DELAY_MS = 3000;

/** sessionStorage: set the moment the banner is shown, so it appears once per tab session. */
export const INSTALL_SESSION_SHOWN_KEY = 'makkah-pwa-install-shown';

/** localStorage: timestamp (ms) of the last dismissal. */
export const INSTALL_DISMISSED_AT_KEY = 'makkah-pwa-install-dismissed-at';

/** localStorage: 'true' once the app has been installed — then never show again. */
export const INSTALL_INSTALLED_KEY = 'makkah-pwa-installed';

/**
 * Routes where the banner must never appear: admin, auth, and transactional
 * flows, plus the offline fallback. Matches `/checkout`, `/account/orders`, etc.
 */
export const INSTALL_ROUTE_EXCLUDED = /^\/(admin|login|register|checkout|account|orders|offline|404|not-found|error)(\/|$)/;

export function isRouteExcluded(pathname: string): boolean {
  return INSTALL_ROUTE_EXCLUDED.test(pathname);
}

/** Parses a stored dismissal timestamp, tolerating missing/garbage values. */
export function parseDismissedAt(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * The single source of truth for whether the banner may be revealed right now.
 * Every guard the spec requires lives here so it can be tested in isolation.
 */
export function shouldShowInstallBanner(params: {
  installed: boolean;
  standalone: boolean;
  excludedRoute: boolean;
  sessionShown: boolean;
  dismissedAt: number | null;
  now?: number;
}): boolean {
  const now = params.now ?? Date.now();
  if (params.installed || params.standalone) return false;
  if (params.excludedRoute) return false;
  if (params.sessionShown) return false;
  if (
    params.dismissedAt != null &&
    Number.isFinite(params.dismissedAt) &&
    now - params.dismissedAt < INSTALL_DISMISS_DURATION_MS
  ) {
    return false;
  }
  return true;
}
