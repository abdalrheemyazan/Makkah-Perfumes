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
 *   stage plate  — generated backdrop (stone, rim light, smoke)
 *   product      — the real client packshot, unmodified
 *   copy         — real HTML text
 *
 * Keeping the product on its own layer is what makes the parallax possible, and
 * it is also why the bottle is pixel-exact: it is the client's photograph, not a
 * render. An earlier attempt to have the model draw the bottle misspelled the
 * label (see docs/GENERATION_LOG.md), so identity now always comes from the
 * real asset.
 *
 * Motion contract:
 *   - Scroll *drives* the layers (scrub), it is never hijacked. Wheel and
 *     touch behave natively; there is no scroll-jacking library.
 *   - The copy and CTAs are real HTML, present and clickable on first paint,
 *     regardless of whether GSAP ever loads.
 *   - prefers-reduced-motion: no animation code is imported at all.
 *   - Narrow screens get the portrait asset and no parallax — pinning and
 *     mobile scrolling fight each other.
 */
export function CinematicHero({
  posterDesktop,
  posterMobile,
  stagePlate,
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
  posterMobile: string;
  stagePlate: string;
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
  const glowRef = useRef<HTMLDivElement>(null);

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
            scrub: 0.6,
          },
        });

        // Layers move at different rates — that difference is the depth cue.
        timeline
          .to(stageRef.current, { yPercent: 12, scale: 1.08, ease: 'none' }, 0)
          .to(glowRef.current, { yPercent: 18, opacity: 0.35, ease: 'none' }, 0)
          .to(productRef.current, { yPercent: -6, scale: 1.03, ease: 'none' }, 0)
          .to(copyRef.current, { yPercent: -18, opacity: 0, ease: 'none' }, 0);
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
      className="relative flex min-h-svh items-center overflow-hidden pt-18"
    >
      {/* ---- Layer 1: generated stage plate ---- */}
      <div ref={stageRef} aria-hidden="true" className="absolute inset-0 will-change-transform">
        <Image
          src={isNarrow ? posterMobile : stagePlate}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Deepen the side where the Hebrew copy sits so text keeps contrast. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to left, var(--color-ink) 8%, color-mix(in oklab, var(--color-ink) 72%, transparent) 42%, transparent 78%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: 'linear-gradient(to top, var(--color-ink), transparent)' }}
        />
      </div>

      {/* ---- Layer 2: warm light bloom ---- */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute start-[-6%] top-[6%] h-[60vh] w-[60vh] rounded-full opacity-60 blur-3xl will-change-transform"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--color-amber) 45%, transparent) 0%, transparent 68%)',
        }}
      />

      <div className="container-editorial relative grid items-center gap-10 py-20 lg:grid-cols-2">
        {/* ---- Layer 4: copy (first in DOM => right side in RTL) ---- */}
        <div ref={copyRef} className="max-w-xl will-change-transform">
          <p className="text-sm tracking-[0.2em] text-gold uppercase">{eyebrowHe}</p>

          <h1
            id="hero-title"
            className="mt-6 font-serif text-5xl leading-[1.08] text-ivory sm:text-6xl lg:text-7xl"
          >
            {titleHe}
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-cream/85 sm:text-lg">
            {bodyHe}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={primaryCtaHref}
              className="inline-flex h-13 items-center rounded-sm bg-gold px-7 text-base font-medium text-ink transition-colors duration-200 hover:bg-cream"
            >
              {primaryCtaHe}
            </Link>
            <Link
              href={secondaryCtaHref}
              className="inline-flex h-13 items-center rounded-sm border border-gold/45 px-7 text-base text-cream transition-colors duration-200 hover:border-gold hover:text-ivory"
            >
              {secondaryCtaHe}
            </Link>
          </div>
        </div>

        {/* ---- Layer 3: the real product, never regenerated ---- */}
        <div
          ref={productRef}
          className="relative mx-auto hidden w-full max-w-md will-change-transform lg:block"
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
