import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import { SITE } from '@/lib/site';
import './globals.css';

/**
 * Hebrew typography.
 *
 * Heebo — a clean, highly readable Hebrew sans — is now the single family for
 * the entire site: navigation, headings, body, forms, admin. The decorative
 * serif (Frank Ruhl Libre) was removed because at display sizes its thin strokes
 * and heavy contrast hurt Hebrew legibility, and it read as ornamental rather
 * than premium.
 *
 * Both the `--font-body` and `--font-display` variables resolve to Heebo, so
 * every `font-serif`/`font-sans` utility already in the codebase renders in the
 * one family without touching each call site. Weight, not family, now carries
 * the hierarchy (body 400 · controls 500 · section headings 600 · page titles
 * 700). Self-hosted by next/font at build time — no runtime request, no layout
 * shift. SIL Open Font License.
 */
const heebo = Heebo({
  variable: '--font-body',
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    // Tab format per brand: "<Hebrew page> | Makkah Perfumes".
    default: `בית | ${SITE.nameEn}`,
    template: `%s | ${SITE.nameEn}`,
  },
  description: SITE.descriptionHe,
  applicationName: SITE.nameEn,
  // Web app manifest (src/app/manifest.ts → /manifest.webmanifest).
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: SITE.nameEn,
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=20260730', type: 'image/x-icon' },
      { url: '/icons/favicon-16.png?v=20260730', type: 'image/png', sizes: '16x16' },
      { url: '/icons/favicon-32.png?v=20260730', type: 'image/png', sizes: '32x32' },
      { url: '/icons/favicon-48.png?v=20260730', type: 'image/png', sizes: '48x48' },
    ],
    shortcut: [{ url: '/favicon.ico?v=20260730', type: 'image/x-icon' }],
    apple: [{ url: '/apple-icon.png?v=20260730', type: 'image/png', sizes: '180x180' }],
  },
  // Explicit, versioned favicon/shortcut/Apple links evict the former starter
  // icon. Every referenced file is generated from the same official monogram.
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: SITE.nameEn,
    title: `${SITE.nameHe} — בשמי יוקרה, לבונה וקטורת`,
    description: SITE.descriptionHe,
    images: ['/generated/social/og-home.jpg'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0b0a08',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full antialiased`}
    >
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=JSON.parse(localStorage.getItem('makkah-a11y')||'{}');var e=document.documentElement;if(s.contrast)e.classList.add('a11y-contrast');if(s.links)e.classList.add('a11y-links');if(s.stopMotion)e.classList.add('a11y-stop-motion');if(s.readable)e.classList.add('a11y-readable');if(s.fontScale&&s.fontScale!==100)e.style.fontSize=s.fontScale+'%';}catch(_){}})();",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-ink text-ivory">
        {/* Applies persisted accessibility preferences before first paint, so a
            returning visitor never sees a flash of the default styling. Mirrors
            AccessibilitySettings' own class/font-size logic. */}
        {children}
      </body>
    </html>
  );
}
