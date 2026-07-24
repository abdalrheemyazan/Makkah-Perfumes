import type { Metadata, Viewport } from 'next';
import { Frank_Ruhl_Libre, Heebo } from 'next/font/google';
import { SITE } from '@/lib/site';
import './globals.css';

/**
 * Hebrew typography.
 *  - Frank Ruhl Libre: an elegant Hebrew serif, used for display headings.
 *  - Heebo: a high-quality Hebrew sans, used for all interface text.
 * Both are SIL Open Font License and self-hosted by next/font at build time,
 * so there is no runtime request to Google and no layout shift.
 */
const display = Frank_Ruhl_Libre({
  variable: '--font-display',
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

const body = Heebo({
  variable: '--font-body',
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.nameHe} — בשמי יוקרה, לבונה וקטורת`,
    template: `%s | ${SITE.nameHe}`,
  },
  description: SITE.descriptionHe,
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: SITE.nameHe,
    title: `${SITE.nameHe} — בשמי יוקרה, לבונה וקטורת`,
    description: SITE.descriptionHe,
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
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink text-ivory">{children}</body>
    </html>
  );
}
