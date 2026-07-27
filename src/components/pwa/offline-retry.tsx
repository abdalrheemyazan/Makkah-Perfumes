'use client';

/**
 * Retry control for the offline page. A full reload re-attempts the navigation;
 * if the network is back the real page replaces this fallback.
 */
export function OfflineRetry() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex h-11 items-center justify-center rounded-sm bg-gold px-6 text-sm font-medium text-ink transition-colors duration-200 hover:bg-cream"
    >
      ניסיון חוזר
    </button>
  );
}
