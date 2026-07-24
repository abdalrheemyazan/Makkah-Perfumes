'use client';

import { useEffect, useState } from 'react';

/**
 * Scroll indicator.
 *
 * It is a real link to the next section, so keyboard users get the same
 * affordance as mouse users, and it hides itself once the visitor has scrolled.
 */
export function ScrollCue() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      // Points at the story, which now follows the hero.
      href="#story-heading"
      // Desktop only: on mobile the copy is anchored to the bottom of the hero
      // and the cue collided with the secondary CTA. Touch users also do not
      // need to be told that a page scrolls.
      className={`absolute inset-x-0 bottom-8 mx-auto hidden w-fit flex-col items-center gap-2 text-xs tracking-[0.2em] text-cream/70 transition-opacity duration-500 hover:text-gold lg:flex ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      גללו לגילוי
      <span
        aria-hidden="true"
        className="block h-10 w-px bg-gradient-to-b from-gold/70 to-transparent motion-safe:animate-pulse"
      />
    </a>
  );
}
