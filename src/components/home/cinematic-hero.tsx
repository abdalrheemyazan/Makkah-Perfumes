'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useA11yMotionStopped,
  useIsNarrowerThan,
  usePrefersReducedMotion,
} from '@/lib/hooks';

/**
 * Cinematic hero.
 *
 * The scene is composed live in the browser rather than baked into one picture,
 * so the product stays pixel-exact (it is the client's transparent packshot,
 * never a render — an earlier attempt to have the model draw the bottle
 * misspelled the label; see docs/GENERATION_LOG.md) and every atmospheric
 * element can respond to motion preferences.
 *
 *   background    — near-black studio with a warm amber key light (still-ish)
 *   smoke         — three drifting frankincense plumes, behind the bottle
 *   pedestal      — a LOW monolithic stone surface, built in CSS
 *   contact shadow— grounds the bottle onto that surface
 *   product       — the real packshot, standing on the pedestal
 *   copy          — real HTML text
 *
 * Grounding contract (this is the whole point of the redesign):
 *   - The bottle's base (96.8% down its transparent cutout) meets the pedestal
 *     top. A soft contact shadow + ambient-occlusion core sit directly beneath
 *     it, and the pedestal's front edge catches the key light — so the bottle
 *     reads as STANDING ON the surface, not floating above a cube.
 *   - On scroll the bottle and its pedestal move together as one grounded unit
 *     (never separated); only the smoke fades and the copy leaves.
 *
 * Motion contract:
 *   - Ambient smoke/light are slow CSS animations (15–34s). They pause when the
 *     hero scrolls off-screen (IntersectionObserver → `.hero-paused`), freeze
 *     under prefers-reduced-motion, and stop when the visitor picks
 *     "עצירת אנימציות" (`.a11y-stop-motion`). A static plume replaces them so
 *     the stage is never empty.
 *   - The GSAP scroll timeline is scrubbed, never scroll-jacking, and is not
 *     even imported when motion is disabled or on narrow screens.
 *   - Copy and CTAs are real HTML, present and clickable on first paint whether
 *     or not GSAP loads.
 */

/** Dust motes. Hard-coded so server and client render identical markup. */
const DUST = [
  { left: '14%', bottom: '22%', size: 3, duration: '24s', delay: '0s', opacity: 0.45 },
  { left: '22%', bottom: '40%', size: 2, duration: '31s', delay: '-6s', opacity: 0.32 },
  { left: '30%', bottom: '16%', size: 3, duration: '27s', delay: '-13s', opacity: 0.4 },
  { left: '18%', bottom: '54%', size: 2, duration: '35s', delay: '-3s', opacity: 0.28 },
  { left: '38%', bottom: '30%', size: 2, duration: '29s', delay: '-18s', opacity: 0.34 },
] as const;

export function CinematicHero({
  posterDesktop,
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
  const productStageRef = useRef<HTMLDivElement>(null);
  const smokeRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();
  const motionStopped = useA11yMotionStopped();
  const isNarrow = useIsNarrowerThan(1024);
  const animate = !reducedMotion && !motionStopped && !isNarrow;

  // Pause every ambient/smoke animation while the hero is off-screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        section.classList.toggle('hero-paused', !entry?.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Scroll-scrubbed parallax. The bottle + pedestal move as one grounded unit.
  useEffect(() => {
    if (!animate) return;
    const section = sectionRef.current;
    if (!section) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

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
            scrub: 1.1,
          },
        });

        timeline
          // Background breathes only; it never slides.
          .to(stageRef.current, { scale: 1.03, ease: 'none' }, 0)
          // Atmosphere drifts and dims a touch for depth.
          .to(atmosphereRef.current, { yPercent: 6, opacity: 0.45, ease: 'none' }, 0)
          // Smoke fades gently as we leave.
          .to(smokeRef.current, { opacity: 0.15, ease: 'none' }, 0)
          // Bottle + pedestal rise together — grounded, never separated.
          .to(productStageRef.current, { yPercent: -4, ease: 'none' }, 0)
          // Copy leaves first, so the artwork carries you into the story.
          .to(copyRef.current, { yPercent: -14, opacity: 0, ease: 'none' }, 0);
      }, section);

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
      className="relative flex min-h-svh items-end overflow-hidden pt-24 lg:items-center lg:pt-28"
    >
      {/* ---- Background: near-black studio + warm key light ---- */}
      <div ref={stageRef} aria-hidden="true" className="absolute inset-0 will-change-transform">
        <div className="absolute inset-0 bg-ink" />
        {/* Warm key beam from the top inline-start corner (right in RTL is start). */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 84% -8%, color-mix(in oklab, var(--color-amber) 30%, transparent) 0%, transparent 46%)',
          }}
        />
        {/* Cool depth on the far side. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 80% at 6% 110%, color-mix(in oklab, var(--color-ink-raised) 90%, transparent) 0%, transparent 60%)',
          }}
        />
        {/* Grounding vignette so the base of the scene reads as floor. */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{ background: 'linear-gradient(to top, var(--color-ink), transparent)' }}
        />
      </div>

      {/* ---- Ambient atmosphere: drifting light + dust ---- */}
      <div ref={atmosphereRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="ambient-light absolute end-[6%] top-[-6%] h-[58vh] w-[58vh] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-amber) 40%, transparent) 0%, transparent 68%)',
          }}
        />
        <div
          className="ambient-haze absolute start-[14%] top-[26%] h-[44vh] w-[64vh] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse, color-mix(in oklab, var(--color-cream) 12%, transparent) 0%, transparent 70%)',
          }}
        />
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
                  'radial-gradient(circle, color-mix(in oklab, var(--color-gold) 82%, transparent), transparent 70%)',
                '--dust-duration': mote.duration,
                '--dust-delay': mote.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative mx-auto grid w-full max-w-[110rem] items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:px-12 lg:py-24">
        {/* ---- Copy (first in DOM => right side in RTL) ---- */}
        <div ref={copyRef} className="order-2 max-w-xl will-change-transform lg:order-1">
          <p className="text-xs tracking-[0.16em] text-gold/90 sm:text-sm">{eyebrowHe}</p>

          <h1
            id="hero-title"
            className="mt-6 text-5xl leading-[1.05] font-bold text-ivory sm:text-6xl lg:text-7xl"
          >
            {titleHe}
          </h1>

          <p className="mt-6 max-w-md text-base leading-[1.85] text-cream/80 sm:text-lg">{bodyHe}</p>

          <div className="mt-10 flex flex-wrap gap-3">
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

        {/* ---- Product stage: bottle standing on a low stone pedestal ----
            The cutout's base sits at ~96.8% of the box, so the pedestal and its
            shadow are anchored near `bottom-[3%]` and the slab extends a little
            below the box. Everything here shares one parallax unit, so the
            bottle and its pedestal never separate. */}
        <div
          ref={productStageRef}
          className="relative order-1 flex w-full items-end justify-center will-change-transform lg:order-2"
        >
          <div className="relative aspect-3/4 w-full max-w-[15rem] sm:max-w-[17rem] lg:max-w-[21rem]">
            {/* Smoke — behind the bottle, rising from the pedestal */}
            <div
              ref={smokeRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-[3%] top-[-8%] z-[1]"
            >
              <span className="hero-smoke hero-smoke--a" />
              <span className="hero-smoke hero-smoke--b" />
              <span className="hero-smoke hero-smoke--c" />
              <span className="hero-smoke-static" />
            </div>

            {/* Pedestal body — a low monolithic slab, extending just below the box. */}
            <div
              aria-hidden="true"
              className="absolute z-[2] h-[11%]"
              style={{
                insetInline: '-14%',
                bottom: '-5%',
                borderRadius: '42% 42% 16% 16% / 64% 64% 22% 22%',
                background:
                  'linear-gradient(to bottom, color-mix(in oklab, var(--color-stone) 88%, black) 0%, color-mix(in oklab, var(--color-ink) 94%, black) 60%, var(--color-ink) 100%)',
                boxShadow: '0 26px 50px rgba(0,0,0,0.6)',
              }}
            />
            {/* Pedestal top plane — subtle lit stone surface right at the base. */}
            <div
              aria-hidden="true"
              className="absolute z-[3] h-[7%]"
              style={{
                insetInline: '-11%',
                bottom: '1%',
                borderRadius: '50%',
                background:
                  'radial-gradient(ellipse at 60% 30%, color-mix(in oklab, var(--color-stone) 96%, transparent) 0%, color-mix(in oklab, var(--color-ink) 92%, transparent) 55%, transparent 80%)',
                filter: 'blur(2px)',
              }}
            />
            {/* Front rim — the pedestal edge catching the warm key light. */}
            <div
              aria-hidden="true"
              className="absolute z-[4] h-[1.4%]"
              style={{
                insetInline: '-6%',
                bottom: '3.4%',
                borderRadius: '50%',
                background:
                  'linear-gradient(to left, transparent, color-mix(in oklab, var(--color-gold) 50%, transparent) 42%, color-mix(in oklab, var(--color-cream) 28%, transparent) 62%, transparent)',
                filter: 'blur(1px)',
              }}
            />
            {/* Contact shadow — grounds the bottle onto the surface. */}
            <div
              aria-hidden="true"
              className="absolute z-[6] h-[5%]"
              style={{
                insetInline: '15%',
                bottom: '1.5%',
                borderRadius: '50%',
                background:
                  'radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.46) 46%, transparent 74%)',
                filter: 'blur(6px)',
              }}
            />
            {/* Ambient-occlusion core — the darkest touch right under the base. */}
            <div
              aria-hidden="true"
              className="absolute z-[7] h-[2.4%]"
              style={{
                insetInline: '30%',
                bottom: '2.6%',
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, transparent 70%)',
                filter: 'blur(3px)',
              }}
            />

            {/* The real product — standing on the pedestal, never regenerated. */}
            <Image
              src={productSrc}
              alt={productAltHe}
              fill
              priority
              sizes="(max-width: 1024px) 60vw, 26vw"
              className="relative z-10 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Static poster for print and as an absolute last-resort visual. */}
      <noscript>
        <Image src={posterDesktop} alt={productAltHe} fill sizes="100vw" className="object-cover" />
      </noscript>
    </section>
  );
}
