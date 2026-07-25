'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, LayoutDashboard, Menu, Search, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { MAIN_NAV, SITE } from '@/lib/site';
import { useScrolledPast } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * Site header.
 *
 * RTL notes:
 *  - The logo is first in DOM order, so in `dir="rtl"` it lands on the right
 *    and the utility icons on the left. No manual flipping is involved.
 *  - The mobile drawer uses `start-0`, which Tailwind maps to
 *    `inset-inline-start` — the right edge in Hebrew, i.e. the near edge.
 *
 * Layout: the bar spans the full viewport and its contents run to a wide
 * 110rem measure, deliberately wider than the 80rem editorial column. A
 * navigation constrained to the text column reads as a floating island rather
 * than a top bar.
 *
 * Over the homepage hero the bar has no fill — just a soft top-down scrim that
 * keeps the links legible against the artwork. Past the fold it settles into a
 * blurred, bordered bar and loses a little height.
 */
export function SiteHeader({
  cartCount,
  wishlistCount,
  adminInfo,
}: {
  cartCount: number;
  wishlistCount: number;
  adminInfo?: { isAdmin: boolean; isSuperAdmin: boolean } | null;
}) {
  const pathname = usePathname();
  const scrolled = useScrolledPast(24);
  // The drawer records which route it was opened on, so a route change closes
  // it as derived state rather than through an effect.
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const menuOpen = openedOnPath === pathname;
  const closeMenu = () => setOpenedOnPath(null);

  // The homepage hero sits under a transparent header; every other page needs
  // the solid bar immediately or the nav would be unreadable.
  const overHero = pathname === '/';
  const solid = scrolled || !overHero || menuOpen;

  // Escape closes the drawer and returns focus to the trigger.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-100 focus:rounded-sm focus:bg-gold focus:px-4 focus:py-2 focus:text-ink"
      >
        דילוג לתוכן הראשי
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ease-[var(--ease-editorial)]',
          solid
            ? 'border-b border-gold/15 bg-ink/80 backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        {/* Scrim: legibility over the hero without committing to a solid bar. */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-32 transition-opacity duration-500',
            solid ? 'opacity-0' : 'opacity-100',
          )}
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in oklab, var(--color-ink) 78%, transparent), transparent)',
          }}
        />

        <div
          className={cn(
            'relative mx-auto flex w-full max-w-[110rem] items-center justify-between gap-6 px-5 transition-[height] duration-500 ease-[var(--ease-editorial)] sm:px-8 lg:px-12',
            solid ? 'h-16' : 'h-20 lg:h-24',
          )}
        >
          {/* Logo — right edge in RTL.
              The ivory variant is a real cutout (see scripts/build-logo-variants.mjs);
              the original logo.webp has an opaque white background and cannot be
              filtered onto a dark surface. */}
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label={`${SITE.nameHe} — לעמוד הבית`}
          >
            <Image
              src="/brand-reference/logo/logo-ivory.png"
              alt=""
              width={512}
              height={438}
              priority
              className={cn(
                'w-auto object-contain transition-[height] duration-500 ease-[var(--ease-editorial)]',
                solid ? 'h-10' : 'h-12 lg:h-14',
              )}
            />
          </Link>

          {/* Desktop navigation — centred, so the bar reads as one balanced unit */}
          <nav aria-label="ניווט ראשי" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-center gap-8 xl:gap-10">
              {MAIN_NAV.map((item) => {
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        // A hairline that grows from the centre on hover — quieter
                        // than a colour flash and it never shifts the layout.
                        'relative py-2 text-[0.9rem] tracking-wide whitespace-nowrap transition-colors duration-200',
                        'after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-px after:w-0 after:bg-gold after:transition-[width] after:duration-300 hover:after:w-full',
                        active ? 'text-gold after:w-full' : 'text-cream/85 hover:text-ivory',
                      )}
                    >
                      {item.labelHe}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Utility icons — left edge in RTL */}
          <div className="flex shrink-0 items-center gap-1">
            <IconLink href="/search" label="חיפוש">
              <Search className="h-5 w-5" aria-hidden="true" />
            </IconLink>
            <IconLink href="/wishlist" label="רשימת משאלות" badge={wishlistCount}>
              <Heart className="h-5 w-5" aria-hidden="true" />
            </IconLink>
            <IconLink href="/account" label="החשבון שלי">
              <User className="h-5 w-5" aria-hidden="true" />
            </IconLink>
            {adminInfo?.isAdmin && (
              <IconLink href="/admin" label="ניהול האתר">
                <ShieldCheck className="h-5 w-5 text-gold" aria-hidden="true" />
              </IconLink>
            )}
            <IconLink href="/cart" label="עגלת הקניות" badge={cartCount}>
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </IconLink>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpenedOnPath(pathname)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="ms-1 grid h-10 w-10 place-items-center rounded-sm text-cream hover:text-ivory lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">פתיחת תפריט</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — enters from the inline-start edge, i.e. the right in Hebrew */}
      {menuOpen && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            onClick={closeMenu}
            aria-label="סגירת התפריט"
            tabIndex={-1}
          />
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="תפריט ניווט"
            className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col border-e border-gold/20 bg-charcoal p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg text-ivory">תפריט</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                className="grid h-10 w-10 place-items-center rounded-sm text-cream hover:text-ivory"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">סגירת התפריט</span>
              </button>
            </div>

            <nav aria-label="ניווט ראשי במובייל" className="mt-8">
              <ul className="flex flex-col gap-1">
                {MAIN_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-sm py-3 text-base text-cream hover:text-gold"
                    >
                      {item.labelHe}
                    </Link>
                  </li>
                ))}
                {adminInfo?.isAdmin && (
                  <li className="mt-2 border-t border-gold/20 pt-3">
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-sm py-2 text-base font-semibold text-gold hover:text-cream"
                    >
                      <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                      ניהול האתר
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function IconLink({
  href,
  label,
  badge,
  children,
}: {
  href: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative grid h-10 w-10 place-items-center rounded-sm text-cream transition-colors hover:text-ivory"
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="ltr-nums absolute top-1 start-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.6rem] font-semibold text-ink">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <span className="sr-only">
        {label}
        {badge != null && badge > 0 ? ` (${badge})` : ''}
      </span>
    </Link>
  );
}
