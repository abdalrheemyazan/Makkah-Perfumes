'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { MAIN_NAV, SITE } from '@/lib/site';
import { useScrolledPast } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * Site header.
 *
 * RTL notes:
 *  - The logo is first in DOM order, so in `dir="rtl"` it lands on the right
 *    and the utility icons on the left. No manual flipping is involved.
 *  - The mobile drawer slides in from the right (`inset-inline-end: 0`), which
 *    is the near edge in Hebrew.
 */
export function SiteHeader({ cartCount, wishlistCount }: { cartCount: number; wishlistCount: number }) {
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
        className="sr-only focus:not-sr-only focus:fixed focus:inset-inline-start-4 focus:top-4 focus:z-100 focus:rounded-sm focus:bg-gold focus:px-4 focus:py-2 focus:text-ink"
      >
        דילוג לתוכן הראשי
      </a>

      <header
        className={cn(
          'fixed inset-inline-0 top-0 z-50 transition-colors duration-500 ease-[var(--ease-editorial)]',
          solid
            ? 'border-b border-gold/15 bg-ink/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="container-editorial flex h-18 items-center justify-between gap-4">
          {/* Logo — right edge in RTL */}
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`${SITE.nameHe} — לעמוד הבית`}>
            <Image
              src="/brand-reference/logo/logo.webp"
              alt=""
              width={44}
              height={44}
              priority
              className="h-10 w-10 object-contain brightness-0 invert"
            />
            <span className="hidden font-serif text-lg tracking-wide text-ivory sm:block">
              {SITE.nameHe}
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="ניווט ראשי" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {MAIN_NAV.map((item) => {
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'text-sm tracking-wide transition-colors duration-200',
                        active ? 'text-gold' : 'text-cream/80 hover:text-ivory',
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
            className="absolute inset-block-0 inset-inline-start-0 flex w-[min(20rem,85vw)] flex-col border-inline-end border-gold/20 bg-charcoal p-6 shadow-2xl"
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
        <span className="ltr-nums absolute inset-block-start-1 inset-inline-start-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.6rem] font-semibold text-ink">
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
