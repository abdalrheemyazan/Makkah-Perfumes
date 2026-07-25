'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRODUCT_TABS } from '@/lib/admin/nav';
import { cn } from '@/lib/utils';

/**
 * Secondary navigation for the Products area: Products · Categories · Collections.
 * These are product tools, not top-level admin sections.
 */
export function ProductTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="ניווט מוצרים" className="mb-6 border-b border-gold/15">
      <ul className="-mb-px flex flex-wrap gap-1">
        {PRODUCT_TABS.map((tab) => {
          const active =
            tab.href === '/admin/products'
              ? pathname === '/admin/products'
              : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-block border-b-2 px-4 py-2.5 text-sm transition-colors',
                  active
                    ? 'border-gold font-medium text-gold'
                    : 'border-transparent text-cream/75 hover:text-ivory',
                )}
              >
                {tab.labelHe}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
