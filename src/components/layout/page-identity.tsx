import Link from 'next/link';
import Image from 'next/image';
import { SITE } from '@/lib/site';

/**
 * Inner-page identity block.
 *
 * A compact, centred masthead placed directly below the global navbar on inner
 * pages (account, wishlist, contact, about, the accessibility statement …). It
 * gives every inner page the same quiet brand anchor without ever looking like a
 * second navigation bar: no links row, no fill, just logo → brand → page title →
 * optional breadcrumb.
 *
 * Deliberately NOT used over the homepage hero, which has its own identity.
 *
 * RTL: the breadcrumb is a real ordered list. In `dir="rtl"` the items already
 * read right-to-left in DOM order (בית ← current), so no manual reversal is
 * needed. The separator is decorative and hidden from assistive tech.
 */

export type Crumb = { labelHe: string; href?: string };

export function PageIdentity({
  titleHe,
  breadcrumb,
  descriptionHe,
}: {
  titleHe: string;
  breadcrumb?: Crumb[];
  descriptionHe?: string;
}) {
  return (
    <header className="border-b border-gold/10">
      <div className="container-editorial flex flex-col items-center pt-28 pb-10 text-center sm:pt-32 lg:pt-36">
        <Link
          href="/"
          className="inline-flex items-center rounded-sm"
          aria-label={`${SITE.nameHe} — לעמוד הבית`}
        >
          <Image
            src="/brand-reference/logo/logo-ivory.png"
            alt=""
            width={512}
            height={438}
            className="h-11 w-auto object-contain sm:h-14"
            priority
          />
        </Link>

        <p
          className="mt-4 text-[0.68rem] font-medium tracking-[0.28em] text-gold/80"
          dir="ltr"
          lang="en"
        >
          {SITE.nameEn}
        </p>

        <h1 className="mt-3 text-[1.65rem] font-bold text-ivory sm:text-4xl">{titleHe}</h1>

        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="נתיב ניווט" className="mt-4">
            <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
              {breadcrumb.map((crumb, index) => {
                const isLast = index === breadcrumb.length - 1;
                return (
                  <li key={`${crumb.labelHe}-${index}`} className="flex items-center gap-x-2">
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="transition-colors hover:text-cream">
                        {crumb.labelHe}
                      </Link>
                    ) : (
                      <span className={isLast ? 'text-cream/80' : undefined} aria-current={isLast ? 'page' : undefined}>
                        {crumb.labelHe}
                      </span>
                    )}
                    {!isLast && (
                      <span aria-hidden="true" className="text-faint">
                        /
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {descriptionHe && (
          <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/70">{descriptionHe}</p>
        )}
      </div>
    </header>
  );
}
