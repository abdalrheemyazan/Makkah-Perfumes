'use client';

import { useSyncExternalStore } from 'react';

/**
 * Browser-state hooks built on `useSyncExternalStore`.
 *
 * These read from real browser APIs rather than mirroring them into state
 * inside an effect. That avoids the cascading re-render that `setState` in an
 * effect body causes, and gives a correct value on the very first client render
 * instead of one frame late.
 */

const noopSubscribe = () => () => {};

/** True when the visitor has asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    // Server snapshot: assume reduced motion, so nothing heavy is ever part of
    // the initial HTML and the first paint is never a surprise animation.
    () => true,
  );
}

/** True when the connection is flagged as data-saving. */
export function useSaveData(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
      ),
    () => false,
  );
}

/** True once the page has scrolled past `threshold` pixels. */
export function useScrolledPast(threshold: number): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('scroll', onChange, { passive: true });
      return () => window.removeEventListener('scroll', onChange);
    },
    () => window.scrollY > threshold,
    () => false,
  );
}

/**
 * True when the visitor has switched on "עצירת אנימציות" in the accessibility
 * panel. Backed by a class on <html> so a blocking init script can apply it
 * before first paint; the panel dispatches `a11y-change` when it toggles.
 *
 * Motion-driving components (the hero's GSAP scroll timeline, any decorative
 * video) read this alongside `usePrefersReducedMotion` and stand down when
 * either is true. Purely-CSS ambient motion is frozen by the `.a11y-stop-motion`
 * stylesheet rule and needs no JS.
 */
export function useA11yMotionStopped(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('a11y-change', onChange);
      return () => window.removeEventListener('a11y-change', onChange);
    },
    () => document.documentElement.classList.contains('a11y-stop-motion'),
    // Server + first client snapshot: assume stopped, so no motion is ever part
    // of the initial paint. The real value resolves on mount.
    () => true,
  );
}

/** True when the browser can register push subscriptions (service worker + Push API). */
export function usePushSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => 'serviceWorker' in navigator && 'PushManager' in window,
    // Server + first client snapshot: assume unsupported so the push control is
    // never in the initial HTML; the real value resolves on mount.
    () => false,
  );
}

/** True below the given viewport width. Used to pick mobile media variants. */
export function useIsNarrowerThan(width: number): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(`(max-width: ${width - 1}px)`);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(`(max-width: ${width - 1}px)`).matches,
    () => false,
  );
}
