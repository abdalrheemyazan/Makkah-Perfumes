import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { OfflineRetry } from '@/components/pwa/offline-retry';

/**
 * Offline fallback, served by the service worker when a public navigation fails
 * with no network. Deliberately static and self-contained (no data, no header
 * that needs the server) so it renders from cache. It never implies that a cart,
 * checkout or order action succeeded — those require a live connection.
 */
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'אין חיבור לאינטרנט',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-ivory"
    >
      <Image
        src="/brand-reference/logo/logo-ivory.png"
        alt="Makkah Perfumes"
        width={180}
        height={154}
        priority
        className="h-auto w-40 opacity-90"
      />

      <h1 className="font-serif text-2xl text-ivory sm:text-3xl">אין כרגע חיבור לאינטרנט</h1>

      <p className="max-w-sm text-sm leading-relaxed text-cream/80">
        בדקו את החיבור ונסו שוב. פעולות רכישה וניהול מלאי דורשות חיבור פעיל.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <OfflineRetry />
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-sm border border-gold/40 px-6 text-sm text-gold transition-colors hover:bg-gold hover:text-ink"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </main>
  );
}
