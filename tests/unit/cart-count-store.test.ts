import { beforeEach, describe, expect, it } from 'vitest';
import { useCartCountStore } from '@/lib/commerce/cart-count-store';

/**
 * The navbar badge's client store. These assertions pin the optimistic
 * add-to-cart contract: the badge moves immediately, reconciles to the server's
 * authoritative count on success, and rolls back exactly on failure.
 */
describe('cart-count store', () => {
  beforeEach(() => {
    useCartCountStore.setState({ count: null });
  });

  it('starts empty so consumers fall back to the server-rendered count', () => {
    expect(useCartCountStore.getState().count).toBeNull();
  });

  it('seeds from a server-rendered value on hydrate', () => {
    useCartCountStore.getState().hydrate(3);
    expect(useCartCountStore.getState().count).toBe(3);
  });

  it('bumps optimistically before the server answers', () => {
    useCartCountStore.getState().hydrate(2);
    useCartCountStore.getState().applyDelta(1);
    expect(useCartCountStore.getState().count).toBe(3);
  });

  it('treats a delta from an unseeded badge as starting at zero', () => {
    useCartCountStore.getState().applyDelta(1);
    expect(useCartCountStore.getState().count).toBe(1);
  });

  it('never shows a negative badge', () => {
    useCartCountStore.getState().hydrate(1);
    useCartCountStore.getState().applyDelta(-5);
    expect(useCartCountStore.getState().count).toBe(0);
    useCartCountStore.getState().setCount(-3);
    expect(useCartCountStore.getState().count).toBe(0);
  });

  it('reconciles to the server count on success', () => {
    const store = useCartCountStore.getState();
    store.hydrate(2);
    const before = useCartCountStore.getState().count; // 2
    store.applyDelta(1); // optimistic -> 3
    expect(useCartCountStore.getState().count).toBe(3);
    // Server returns authoritative count (e.g. the line was already at max).
    store.setCount(4);
    expect(useCartCountStore.getState().count).toBe(4);
    expect(before).toBe(2);
  });

  it('rolls back to exactly the pre-click value on failure', () => {
    const store = useCartCountStore.getState();
    store.hydrate(2);
    const before = useCartCountStore.getState().count ?? 0;
    store.applyDelta(1); // optimistic -> 3
    expect(useCartCountStore.getState().count).toBe(3);
    // Out of stock: roll back.
    store.setCount(before);
    expect(useCartCountStore.getState().count).toBe(2);
  });
});
