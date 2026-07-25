'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useA11yMotionStopped, usePrefersReducedMotion } from '@/lib/hooks';

/**
 * Subtle route transition.
 *
 * On a route change it replays a short CSS fade/rise on a STABLE wrapper — the
 * children are never re-keyed or remounted, so client form state (the cart
 * coupon field, checkout inputs, dialogs) is preserved across a server action's
 * revalidation. An earlier `motion.div key={pathname}` version reset uncontrolled
 * inputs when a same-route server action re-rendered the tree; this does not.
 *
 * The navbar and footer live outside this wrapper, so they never animate.
 * Respects prefers-reduced-motion and the accessibility panel's
 * "עצירת אנימציות" (both handled in CSS as well, belt and braces).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const motionStopped = useA11yMotionStopped();
  const ref = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the initial mount so first paint / hydration never flashes.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reducedMotion || motionStopped) return;
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter');
    // Force a reflow so the animation restarts on every navigation.
    void el.offsetWidth;
    el.classList.add('page-enter');
  }, [pathname, reducedMotion, motionStopped]);

  return (
    <div ref={ref} className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
