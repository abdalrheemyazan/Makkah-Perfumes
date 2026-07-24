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
