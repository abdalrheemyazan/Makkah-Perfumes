'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { MAIN_NAV, SITE } from '@/lib/site';
import { logout } from '@/app/actions/auth';
import { useScrolledPast } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * Site header.
 *
 * Auth state is rendered from the server (the layout resolves the session and
 * passes `account`), so a signed-in visitor never sees a flash of "התחברות".
 *
 * RTL notes:
 *  - The logo is first in DOM order, so in `dir="rtl"` it lands on the right
 *    and the utility icons on the left. No manual flipping is involved.
 *  - The mobile drawer uses `start-0` (inset-inline-start → the right edge).
 */

type Account = {
  isLoggedIn: boolean;
  displayName: string | null;
  isAdmin: boolean;
};

export function SiteHeader({
  cartCount,
  wishlistCount,
  account,
}: {
  cartCount: number;
  wishlistCount: number;
  account: Account;
}) {
  const pathname = usePathname();
  const scrolled = useScrolledPast(24);
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const menuOpen = openedOnPath === pathname;
  const closeMenu = () => setOpenedOnPath(null);

  const overHero = pathname === '/';
  const solid = scrolled || !overHero || menuOpen;

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

            {account.isLoggedIn ? (
              <AccountMenu displayName={account.displayName} isAdmin={account.isAdmin} />
            ) : (
              <Link
                href="/login"
                aria-label="התחברות"
                className="flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-sm text-cream transition-colors hover:text-ivory"
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">התחברות</span>
              </Link>
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

      {/* Mobile drawer */}
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
            className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto border-e border-gold/20 bg-charcoal p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-ivory">תפריט</span>
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

            {/* Account section */}
            <div className="mt-6 border-t border-gold/15 pt-5">
              {account.isLoggedIn ? (
                <>
                  <p className="text-sm font-semibold text-ivory">
                    שלום, {account.displayName || 'לקוח יקר'}
                  </p>
                  <ul className="mt-3 flex flex-col gap-1">
                    <li>
                      <Link href="/account" className="block rounded-sm py-2.5 text-sm text-cream hover:text-gold">
                        החשבון שלי
                      </Link>
                    </li>
                    <li>
                      <Link href="/account/orders" className="block rounded-sm py-2.5 text-sm text-cream hover:text-gold">
                        ההזמנות שלי
                      </Link>
                    </li>
                    <li>
                      <Link href="/wishlist" className="block rounded-sm py-2.5 text-sm text-cream hover:text-gold">
                        רשימת המשאלות
                      </Link>
                    </li>
                    {account.isAdmin && (
                      <li>
                        <Link href="/admin" className="flex items-center gap-2 rounded-sm py-2.5 text-sm font-medium text-gold hover:text-cream">
                          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                          ניהול החנות
                        </Link>
                      </li>
                    )}
                    <li>
                      <form action={logout}>
                        <button type="submit" className="flex w-full items-center gap-2 rounded-sm py-2.5 text-start text-sm text-cream hover:text-danger">
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          התנתקות
                        </button>
                      </form>
                    </li>
                  </ul>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center gap-2 rounded-sm bg-gold px-5 text-sm font-medium text-ink"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  התחברות
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Desktop signed-in account menu: a button ("שלום, <name>") that toggles an
 * accessible dropdown. Escape closes and restores focus to the trigger; a click
 * outside closes it.
 */
function AccountMenu({ displayName, isAdmin }: { displayName: string | null; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    const raf = requestAnimationFrame(() => firstItemRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  const itemClass =
    'flex items-center gap-2.5 px-4 py-2.5 text-sm text-cream transition-colors hover:bg-stone/60 hover:text-ivory';

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`תפריט חשבון — שלום, ${displayName || 'לקוח יקר'}`}
        className="flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-sm text-cream transition-colors hover:text-ivory"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="hidden max-w-[8rem] truncate md:inline">
          שלום, {displayName || 'לקוח יקר'}
        </span>
        <ChevronDown className={cn('hidden h-4 w-4 transition-transform md:inline', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="תפריט חשבון"
          className="absolute end-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-lg border border-gold/20 bg-charcoal py-1 shadow-2xl"
        >
          <Link ref={firstItemRef} href="/account" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <UserRound className="h-4 w-4 text-gold" aria-hidden="true" />
            החשבון שלי
          </Link>
          <Link href="/account/orders" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Package className="h-4 w-4 text-gold" aria-hidden="true" />
            ההזמנות שלי
          </Link>
          <Link href="/wishlist" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Heart className="h-4 w-4 text-gold" aria-hidden="true" />
            רשימת המשאלות
          </Link>
          {isAdmin && (
            <Link href="/admin" role="menuitem" className={cn(itemClass, 'border-t border-gold/10 font-medium text-gold')} onClick={() => setOpen(false)}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              ניהול החנות
            </Link>
          )}
          <form action={logout} className="border-t border-gold/10">
            <button type="submit" role="menuitem" className={cn(itemClass, 'w-full text-start hover:text-danger')}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              התנתקות
            </button>
          </form>
        </div>
      )}
    </div>
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
