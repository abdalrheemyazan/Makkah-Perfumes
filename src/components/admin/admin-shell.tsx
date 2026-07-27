'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Menu, X } from 'lucide-react';
import type { AdminNavItem } from '@/lib/admin/nav';
import { cn } from '@/lib/utils';

/**
 * Admin chrome: RTL sidebar on desktop, drawer on mobile.
 *
 * The nav it renders has already been filtered server-side to the groups this
 * user may see. This component never decides permissions.
 */
export function AdminShell({
  nav,
  userLabelHe,
  rolesHe,
  logoutAction,
  children,
}: {
  nav: AdminNavItem[];
  userLabelHe: string;
  rolesHe: string;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Derived, not mirrored: a route change closes the drawer without an effect.
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = openedOnPath === pathname;
  const close = () => setOpenedOnPath(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const navList = (
    <nav aria-label="ניווט ניהול">
      <ul className="flex flex-col gap-1">
        {nav.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-gold/15 font-medium text-gold'
                    : 'text-cream/80 hover:bg-stone/60 hover:text-ivory',
                )}
              >
                <span>{item.labelHe}</span>
                {item.badge != null && item.badge > 0 && (
                  <span
                    className="ltr-nums grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[0.65rem] font-semibold text-ink"
                    aria-label={`${item.badge} חדשות`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {/* View the public store in a new tab. */}
        <li className="mt-2 border-t border-gold/10 pt-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm text-cream/80 transition-colors hover:bg-stone/60 hover:text-ivory"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            צפייה בחנות
          </a>
        </li>
      </ul>
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-gold/15 pt-4">
      <p className="truncate text-sm text-ivory">{userLabelHe}</p>
      <p className="mt-0.5 text-xs text-faint">{rolesHe}</p>
      <div className="mt-3 flex flex-col gap-2">
        <Link href="/" className="text-xs text-muted hover:text-ivory">
          ← חזרה לאתר
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline">
            התנתקות
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh bg-ink">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gold/15 bg-ink/95 px-4 backdrop-blur lg:hidden">
        <span className="font-serif text-base text-ivory">ניהול</span>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpenedOnPath(pathname)}
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="grid h-10 w-10 place-items-center rounded-sm text-cream hover:text-ivory"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">פתיחת תפריט ניהול</span>
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden border-e border-gold/15 bg-charcoal p-6 lg:flex lg:h-svh lg:flex-col lg:sticky lg:top-0 lg:overflow-y-auto">
          <Link href="/admin" className="font-serif text-lg text-ivory">
            מכה פרפיומס
            <span className="mt-0.5 block text-xs tracking-wide text-gold">לוח ניהול</span>
          </Link>
          <div className="mt-8 flex-1">{navList}</div>
          {footer}
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-60 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-ink/85"
              onClick={close}
              aria-label="סגירת התפריט"
              tabIndex={-1}
            />
            <div
              id="admin-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="תפריט ניהול"
              className="absolute inset-y-0 start-0 flex w-[min(19rem,86vw)] flex-col overflow-y-auto border-e border-gold/20 bg-charcoal p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-base text-ivory">ניהול</span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  className="grid h-10 w-10 place-items-center rounded-sm text-cream hover:text-ivory"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">סגירה</span>
                </button>
              </div>
              <div className="mt-7 flex-1">{navList}</div>
              {footer}
            </div>
          </div>
        )}

        <main id="admin-main" className="min-w-0 p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
