'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useIsNarrowerThan, usePrefersReducedMotion, useSaveData } from '@/lib/hooks';

/**
 * Decorative hero media layer.
 *
 * Rules this component exists to enforce:
 *  - The poster image renders first and is always present, so the hero is never
 *    blank and never depends on JavaScript.
 *  - Video is attached only when the visitor has not asked for reduced motion
 *    and the connection is not flagged as save-data. Both are read directly
 *    from the browser, so the very first client render is already correct.
 *  - The video pauses whenever the hero scrolls off-screen, so it costs nothing
 *    while the visitor is reading the rest of the page.
 *  - If the video fails to load, the poster simply stays. No error state leaks
 *    into the interface.
 */
export function HeroMedia({
  posterSrc,
  posterAltHe,
  videoSrc,
  mobileVideoSrc,
}: {
  posterSrc: string;
  posterAltHe: string;
  videoSrc?: string | null;
  mobileVideoSrc?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();
  const saveData = useSaveData();
  const isMobile = useIsNarrowerThan(768);

  // Set from the <video> element's own events, never from an effect body.
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const resolvedSrc = isMobile && mobileVideoSrc ? mobileVideoSrc : videoSrc;
  const canPlayVideo = Boolean(resolvedSrc) && !reducedMotion && !saveData && !videoFailed;

  // Pause while off-screen — a hero video must not burn battery mid-article.
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !canPlayVideo) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {
            /* autoplay refused — poster remains */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [canPlayVideo]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <Image
        src={posterSrc}
        alt={posterAltHe}
        fill
        priority
        sizes="100vw"
        className={`object-cover transition-opacity duration-1000 ${
          videoReady ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {canPlayVideo && resolvedSrc && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={posterSrc}
          onCanPlay={() => setVideoReady(true)}
          onError={() => {
            setVideoFailed(true);
            setVideoReady(false);
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src={resolvedSrc} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
