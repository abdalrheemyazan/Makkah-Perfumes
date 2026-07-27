'use client';

import Link from 'next/link';

/**
 * Branded error boundary for the app. Renders inside the root layout (so it keeps
 * the Hebrew RTL shell and fonts) whenever a route segment throws. It never
 * exposes the raw error to visitors — the message stays generic and honest.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70svh] place-items-center px-6">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm tracking-[0.15em] text-warning">אירעה תקלה</p>
        <h1 className="mt-4 font-serif text-3xl text-ivory sm:text-4xl">משהו השתבש</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          נתקלנו בבעיה בטעינת העמוד. אפשר לנסות שוב או לחזור לדף הבית.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center rounded-sm bg-gold px-5 text-sm font-medium text-ink transition-colors hover:bg-cream"
          >
            ניסיון חוזר
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-sm border border-gold/40 px-5 text-sm text-cream transition-colors hover:border-gold hover:text-ivory"
          >
            לעמוד הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
