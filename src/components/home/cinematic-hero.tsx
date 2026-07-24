'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useIsNarrowerThan, usePrefersReducedMotion } from '@/lib/hooks';

/**
 * Cinematic hero.
 *
 * Built as separate 2.5D layers rather than one flat picture:
 *
 *   stage plate  — generated backdrop (stone, rim light)
 *   atmosphere   — drifting light, haze and dust (ambient, not scroll-driven)
 *   product      — the real client packshot, unmodified
 *   copy         — real HTML text
 *
 * Keeping the product on its own layer is what makes the parallax possible, and
 * it is also why the bottle is pixel-exact: it is the client's photograph, not a
 * render. An earlier attempt to have the model draw the bottle misspelled the
 * label (see docs/GENERATION_LOG.md), so identity always comes from the real asset.
 *
 * Motion contract:
 *   - The STONE DOES NOT MOVE. An earlier version slid the pedestal 12% and
 *     scaled it 8% on scroll; a heavy solid object sliding under a static
 *     bottle reads as a glitch rather than as depth. The plate now only
 *     breathes (≤2% scale) while light, haze and dust carry the life.
 *   - Ambient motion is continuous and slow (26–40s periods), independent of
 *     scroll, so the scene feels alive even when the visitor is still.
 *   - Scroll *drives* the parallax (scrub), it is never hijacked. Wheel and
 *     touch behave natively; there is no scroll-jacking library.
 *   - The copy and CTAs are real HTML, present and clickable on first paint,
 *     regardless of whether GSAP ever loads.
 *   - prefers-reduced-motion: no animation code is imported and every ambient
 *     layer is frozen by the global reduced-motion rule.
 */

/**
 * Dust motes. Positions are hard-coded rather than random so the server and
 * client render identical markup — a Math.random() here would hydrate-mismatch.
 */
const DUST = [
  { left: '12%', bottom: '18%', size: 3, duration: '24s', delay: '0s', opacity: 0.5 },
  { left: '19%', bottom: '32%', size: 2, duration: '31s', delay: '-6s', opacity: 0.35 },
  { left: '26%', bottom: '12%', size: 4, duration: '27s', delay: '-13s', opacity: 0.45 },
  { left: '31%', bottom: '44%', size: 2, duration: '35s', delay: '-3s', opacity: 0.3 },
  { left: '38%', bottom: '24%', size: 3, duration: '29s', delay: '-18s', opacity: 0.4 },
  { left: '44%', bottom: '38%', size: 2, duration: '33s', delay: '-9s', opacity: 0.28 },
  { left: '16%', bottom: '52%', size: 2, duration: '38s', delay: '-22s', opacity: 0.32 },
  { left: '35%', bottom: '58%', size: 3, duration: '26s', delay: '-15s', opacity: 0.36 },
] as const;

export function CinematicHero({
  posterDesktop,
  stagePlate,
  stagePlateMobile,
  productSrc,
  productAltHe,
  eyebrowHe,
  titleHe,
  bodyHe,
  primaryCtaHe,
  primaryCtaHref,
  secondaryCtaHe,
  secondaryCtaHref,
}: {
  posterDesktop: string;
  stagePlate: string;
  /** Portrait plate WITHOUT the product composited in. */
  stagePlateMobile: string;
  productSrc: string;
  productAltHe: string;
  eyebrowHe: string;
  titleHe: string;
  bodyHe: string;
  primaryCtaHe: string;
  primaryCtaHref: string;
  secondaryCtaHe: string;
  secondaryCtaHref: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();
  const isNarrow = useIsNarrowerThan(1024);
  const animate = !reducedMotion && !isNarrow;

  useEffect(() => {
    if (!animate) return;
    const section = sectionRef.current;
    if (!section) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    // Dynamic import: pages that never render the hero pay nothing for GSAP.
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            // A longer scrub trails the scroll slightly, which reads as weight.
            scrub: 1.1,
          },
        });

        timeline
          // The plate only breathes; it never slides.
          .to(stageRef.current, { scale: 1.02, ease: 'none' }, 0)
          // Atmosphere drifts a touch further than the plate for depth.
          .to(atmosphereRef.current, { yPercent: 5, opacity: 0.5, ease: 'none' }, 0)
          // The bottle lifts fractionally — enough to separate from the stone.
          .to(productRef.current, { yPercent: -5, ease: 'none' }, 0)
          // Copy leaves first, so the artwork is what carries you into the story.
          .to(copyRef.current, { yPercent: -14, opacity: 0, ease: 'none' }, 0);
      }, section);

      // Layout shifts once the Hebrew webfonts swap in.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [animate]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      // Mobile anchors the copy to the bottom so the bottle in the poster keeps
      // the upper half to itself; desktop centres the two-column composition.
      className="relative flex min-h-svh items-end overflow-hidden pt-24 lg:items-center lg:pt-28"
    >
      {/* ---- Layer 1: generated stage plate (still) ---- */}
      <div ref={stageRef} aria-hidden="true" className="absolute inset-0 will-change-transform">
        <Image
          src={isNarrow ? stagePlateMobile : stagePlate}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrims differ by axis because the composition does.
            Desktop: bottle on the left, copy on the right — darken sideways.
            Mobile: the poster already contains the bottle, and the copy sits
            beneath it — darken upward instead, or the text would land on the
            label. */}
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              'linear-gradient(to left, var(--color-ink) 10%, color-mix(in oklab, var(--color-ink) 74%, transparent) 44%, transparent 80%)',
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              'linear-gradient(to top, var(--color-ink) 32%, color-mix(in oklab, var(--color-ink) 70%, transparent) 58%, transparent 88%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-48"
          style={{ background: 'linear-gradient(to top, var(--color-ink), transparent)' }}
        />
      </div>

      {/* ---- Layer 2: ambient atmosphere ---- */}
      <div ref={atmosphereRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Warm key light, drifting slowly */}
        <div
          className="ambient-light absolute start-[-8%] top-[2%] h-[62vh] w-[62vh] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-amber) 42%, transparent) 0%, transparent 68%)',
          }}
        />
        {/* Cool counter-haze, drifting the other way for slow cross-motion */}
        <div
          className="ambient-haze absolute start-[18%] top-[24%] h-[46vh] w-[70vh] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse, color-mix(in oklab, var(--color-cream) 14%, transparent) 0%, transparent 70%)',
          }}
        />
        {/* Dust motes rising through the beam */}
        {DUST.map((mote, index) => (
          <span
            key={index}
            className="ambient-dust absolute rounded-full"
            style={
              {
                left: mote.left,
                bottom: mote.bottom,
                width: mote.size,
                height: mote.size,
                opacity: mote.opacity,
                background:
                  'radial-gradient(circle, color-mix(in oklab, var(--color-gold) 85%, transparent), transparent 70%)',
                '--dust-duration': mote.duration,
                '--dust-delay': mote.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative mx-auto grid w-full max-w-[110rem] items-center gap-10 px-5 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:px-12 lg:py-24">
        {/* ---- Layer 4: copy (first in DOM => right side in RTL) ---- */}
        <div ref={copyRef} className="order-2 max-w-xl will-change-transform lg:order-1">
          <p className="text-xs tracking-[0.28em] text-gold/90 uppercase sm:text-sm">
            {eyebrowHe}
          </p>

          <h1
            id="hero-title"
            className="mt-7 font-serif text-5xl leading-[1.05] text-ivory sm:text-6xl lg:text-7xl"
          >
            {titleHe}
          </h1>

          <p className="mt-7 max-w-md text-base leading-[1.85] text-cream/80 sm:text-lg">
            {bodyHe}
          </p>

          <div className="mt-11 flex flex-wrap gap-3">
            <Link
              href={primaryCtaHref}
              className="inline-flex h-13 items-center rounded-sm bg-gold px-8 text-base font-medium text-ink transition-colors duration-200 hover:bg-cream"
            >
              {primaryCtaHe}
            </Link>
            <Link
              href={secondaryCtaHref}
              className="inline-flex h-13 items-center rounded-sm border border-gold/45 px-8 text-base text-cream transition-colors duration-200 hover:border-gold hover:text-ivory"
            >
              {secondaryCtaHe}
            </Link>
          </div>
        </div>

        {/* ---- Layer 3: the real product, never regenerated ---- */}
        <div
          ref={productRef}
          className="relative order-1 mx-auto w-full max-w-[15rem] will-change-transform sm:max-w-xs lg:order-2 lg:max-w-lg"
        >
          <div className="relative aspect-4/5">
            <Image
              src={productSrc}
              alt={productAltHe}
              fill
              priority
              sizes="(max-width: 1024px) 70vw, 42vw"
              className="object-contain drop-shadow-[0_40px_70px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>
      </div>

      {/* Static poster for print and as an absolute last-resort visual. */}
      <noscript>
        <Image
          src={posterDesktop}
          alt={productAltHe}
          fill
          sizes="100vw"
          className="object-cover"
        />
      </noscript>
    </section>
  );
}
