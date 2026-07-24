'use client';

import { useEffect, useRef } from 'react';

/**
 * Pinned brand-story narrative.
 *
 * The chapters are ordinary HTML and are fully readable with JavaScript off,
 * with reduced motion on, or if GSAP fails to load. The scroll effect only
 * changes *when* they are emphasised, never *whether* they exist.
 */

const CHAPTERS = [
  {
    titleHe: 'שרף הלבונה',
    bodyHe: 'הכול מתחיל בשרף שנאסף מגזע העץ ומתקשה לטיפות ענבריות.',
  },
  {
    titleHe: 'העשן העולה',
    bodyHe: 'על גחלת, השרף נפתח לריח יבש, הדרי ומעט חלבי.',
  },
  {
    titleHe: 'שמן הבושם',
    bodyHe: 'טיפה אחר טיפה, התמצית נמזגת ומורכבת לפורמולה.',
  },
  {
    titleHe: 'הבקבוק',
    bodyHe: 'זכוכית מסותתת, פליז מוברש, ותווית שנושאת את השם.',
  },
  {
    titleHe: 'הקולקציה',
    bodyHe: 'שלוש עשרה יצירות שמרכיבות את שפת הבית.',
  },
];

export function BrandStory({ titleHe, bodyHe }: { titleHe: string; bodyHe: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const chaptersRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const list = chaptersRef.current;
    if (!section || !list) return;

    // Respect the visitor's motion preference before loading any animation code.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    // Skip the effect on narrow screens: pinning fights with mobile scrolling.
    if (window.innerWidth < 1024) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    // Dynamic import keeps GSAP out of the bundle for every page that never
    // reaches this section.
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      const items = Array.from(list.querySelectorAll<HTMLElement>('[data-chapter]'));
      const context = gsap.context(() => {
        items.forEach((item) => {
          gsap.fromTo(
            item,
            { opacity: 0.25, y: 24 },
            {
              opacity: 1,
              y: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: item,
                start: 'top 78%',
                end: 'top 42%',
                scrub: true,
              },
            },
          );
        });
      }, section);

      // ScrollTrigger caches layout; recompute after fonts settle.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="story-heading" className="container-editorial py-28">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-sm tracking-[0.2em] text-gold uppercase">הסיפור</p>
          <h2 id="story-heading" className="mt-3 font-serif text-4xl leading-tight text-ivory sm:text-5xl">
            {titleHe}
          </h2>
          {bodyHe && (
            <p className="mt-6 max-w-md text-base leading-relaxed text-cream/80">{bodyHe}</p>
          )}
        </div>

        <ol ref={chaptersRef} className="flex flex-col gap-14">
          {CHAPTERS.map((chapter, index) => (
            <li key={chapter.titleHe} data-chapter className="border-inline-start-2 border-gold/25 ps-6">
              <p className="ltr-nums font-serif text-sm text-gold">
                {String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-2 font-serif text-2xl text-ivory">{chapter.titleHe}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{chapter.bodyHe}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
