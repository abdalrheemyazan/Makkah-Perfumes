'use client';

import { create } from 'zustand';

/**
 * Client-side source of truth for the navbar cart badge.
 *
 * The global layout is a shared server layout: it does NOT re-render on soft
 * client navigations, so the `cartCount` it passes down is only fresh on a full
 * load. After hydration this store owns the number instead, so:
 *
 *   - add-to-cart can bump the badge optimistically (before the server answers)
 *     and then reconcile to the server's authoritative count, and
 *   - the badge stays correct as the visitor moves between routes.
 *
 * `count` is null until the first server value seeds it; consumers fall back to
 * the server-rendered prop until then, so there is never a flash of "0".
 */
type CartCountStore = {
  count: number | null;
  /** Seed/refresh from a server-rendered value (full load or revalidation). */
  hydrate: (serverCount: number) => void;
  /** Replace with the server's authoritative count after a mutation. */
  setCount: (count: number) => void;
  /** Optimistic bump; clamped at zero. */
  applyDelta: (delta: number) => void;
};

export const useCartCountStore = create<CartCountStore>((set) => ({
  count: null,
  hydrate: (serverCount) => set({ count: serverCount }),
  setCount: (count) => set({ count: Math.max(0, count) }),
  applyDelta: (delta) =>
    set((state) => ({ count: Math.max(0, (state.count ?? 0) + delta) })),
}));
