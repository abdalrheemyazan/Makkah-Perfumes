'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useIsNarrowerThan, usePrefersReducedMotion } from '@/lib/hooks';

/**
 * Pinned, scroll-scrubbed story sequence.
 *
 * The animation is *driven by scroll position*, not played on a timer: each
 * chapter's image and text cross-fade as a function of how far through the
 * section the visitor is, so scrolling back reverses it exactly.
 *
 * Degradation is not an afterthought — it is the base case. With reduced motion
 * on, on a narrow screen, or if GSAP fails to load, this renders as an ordinary
 * stacked editorial section where every chapter is visible and readable. The
 * scroll effect only changes *how* the chapters are revealed.
 */

export type StoryChapter = {
  id: string;
  eyebrowHe: string;
  titleHe: string;
  bodyHe: string;
  image: string;
  imageMobile: string;
  altHe: string;
};

export function StorySequence({
  headingHe,
  introHe,
  chapters,
}: {
  headingHe: string;
  introHe: string;
  chapters: StoryChapter[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const isNarrow = useIsNarrowerThan(1024);
  const animate = !reducedMotion && !isNarrow;

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
        const frames = gsap.utils.toArray<HTMLElement>('[data-frame]');
        const texts = gsap.utils.toArray<HTMLElement>('[data-frame-text]');
        if (frames.length === 0) return;

        // One pinned viewport; the timeline spans a chapter-height per chapter.
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${section.offsetHeight - window.innerHeight}`,
            scrub: 0.5,
            pin: '[data-pin]',
            anticipatePin: 1,
          },
        });

        frames.forEach((frame, index) => {
          if (index === 0) return;
          // Cross-fade this frame in as the previous one goes out.
          timeline.to(
            frame,
            { opacity: 1, scale: 1, ease: 'none', duration: 1 },
            index - 1 + 0.35,
          );
          timeline.to(
            frames[index - 1]!,
            { opacity: 0, scale: 1.06, ease: 'none', duration: 1 },
            index - 1 + 0.35,
          );
        });

        texts.forEach((text, index) => {
          if (index > 0) {
            timeline.fromTo(
              text,
              { opacity: 0, y: 28 },
              { opacity: 1, y: 0, ease: 'none', duration: 0.6 },
              index - 1 + 0.4,
            );
          }
          if (index < texts.length - 1) {
            timeline.to(text, { opacity: 0, y: -28, ease: 'none', duration: 0.6 }, index + 0.1);
          }
        });
      }, section);

      void document.fonts?.ready.then(() => ScrollTrigger.refresh());
      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [animate]);

  // ---- Static / reduced-motion / mobile presentation ----------------------
  if (!animate) {
    return (
      <section aria-labelledby="story-heading" className="border-y border-gold/10 bg-charcoal py-20">
        <div className="container-editorial">
          <p className="text-sm tracking-[0.2em] text-gold uppercase">הסיפור</p>
          <h2 id="story-heading" className="mt-3 max-w-xl font-serif text-4xl text-ivory sm:text-5xl">
            {headingHe}
          </h2>
          {introHe && <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/80">{introHe}</p>}

          <ol className="mt-12 flex flex-col gap-14">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <div className="relative aspect-4/3 overflow-hidden rounded-sm border border-gold/15">
                  <Image
                    src={chapter.imageMobile}
                    alt={chapter.altHe}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-5 text-xs tracking-[0.2em] text-gold uppercase">
                  {chapter.eyebrowHe}
                </p>
                <h3 className="mt-2 font-serif text-2xl text-ivory">{chapter.titleHe}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{chapter.bodyHe}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  // ---- Scroll-scrubbed presentation --------------------------------------
  return (
    <section
      ref={sectionRef}
      aria-labelledby="story-heading"
      className="relative border-y border-gold/10 bg-charcoal"
      style={{ height: `${chapters.length * 100}vh` }}
    >
      <div data-pin className="relative h-svh overflow-hidden">
        {/* Stacked frames — only opacity/scale animate, both compositor-friendly. */}
        <div aria-hidden="true" className="absolute inset-0">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              data-frame
              className="absolute inset-0 will-change-[opacity,transform]"
              style={{ opacity: index === 0 ? 1 : 0 }}
            >
              <Image
                src={chapter.image}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority={index === 0}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to left, var(--color-ink) 4%, color-mix(in oklab, var(--color-ink) 65%, transparent) 46%, transparent 82%)',
                }}
              />
            </div>
          ))}
        </div>

        <div className="container-editorial relative flex h-full items-center">
          <div className="max-w-xl">
            <p className="text-sm tracking-[0.2em] text-gold uppercase">הסיפור</p>
            <h2
              id="story-heading"
              className="mt-3 font-serif text-4xl leading-tight text-ivory sm:text-5xl"
            >
              {headingHe}
            </h2>

            {/* Chapters are stacked; the timeline swaps which one is visible.
                All of them stay in the DOM so assistive tech reads the whole
                story rather than whichever frame happens to be showing. */}
            <div className="relative mt-10 min-h-44">
              {chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  data-frame-text
                  className="absolute inset-0 will-change-[opacity,transform]"
                  style={{ opacity: index === 0 ? 1 : 0 }}
                >
                  <p className="ltr-nums font-serif text-sm text-gold">
                    {String(index + 1).padStart(2, '0')} · {chapter.eyebrowHe}
                  </p>
                  <h3 className="mt-2 font-serif text-3xl text-ivory">{chapter.titleHe}</h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-cream/80">
                    {chapter.bodyHe}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
