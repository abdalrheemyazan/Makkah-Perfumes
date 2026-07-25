import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { can, getCurrentUser, isAdmin, type SessionUser } from '@/lib/auth';
import { ADMIN_NAV } from '@/lib/admin/nav';
import { ROLE_LABELS } from '@/lib/admin/labels';
import { logout } from '@/app/actions/auth';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata: Metadata = {
  title: { default: 'לוח ניהול', template: '%s | לוח ניהול' },
  // The admin must never appear in search results.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin gate.
 *
 * This layout renders *inside* the root layout, so it must not emit its own
 * <html>/<body> — the root already provides those, along with `lang="he"`,
 * `dir="rtl"` and the Hebrew font variables.
 *
 * It is also the first of two permission checks, not the only one. It stops a
 * non-admin from *seeing* the dashboard; every page and every Server Action
 * independently calls `requireCapability`, because a layout cannot protect a
 * mutation that is invoked directly.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login?next=/admin');
  if (!isAdmin(user)) return <Forbidden />;

  // Show only the groups this user has at least one capability for.
  const nav = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(user, item.capability)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-100 focus:rounded-sm focus:bg-gold focus:px-4 focus:py-2 focus:text-ink"
      >
        דילוג לתוכן הראשי
      </a>
      <AdminShell
        nav={nav}
        userLabelHe={displayName(user)}
        rolesHe={user.roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ')}
        logoutAction={logout}
      >
        {children}
      </AdminShell>
    </>
  );
}

function displayName(user: SessionUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}

function Forbidden() {
  return (
    <div className="grid min-h-svh place-items-center">
      <div className="mx-auto max-w-md px-6 text-center">
        <p className="text-sm tracking-[0.15em] text-warning">שגיאה 403</p>
        <h1 className="mt-4 font-serif text-3xl text-ivory">אין לכם הרשאה</h1>
        <p className="mt-4 text-sm text-muted">
          החשבון שלכם אינו כולל הרשאת גישה ללוח הניהול. אם לדעתכם זו טעות, פנו
          למנהל המערכת.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-sm bg-gold px-5 text-sm font-medium text-ink"
          >
            חזרה לאתר
          </Link>
          <Link
            href="/account"
            className="inline-flex h-11 items-center rounded-sm border border-gold/40 px-5 text-sm text-cream"
          >
            לחשבון שלי
          </Link>
        </div>
      </div>
    </div>
  );
}
