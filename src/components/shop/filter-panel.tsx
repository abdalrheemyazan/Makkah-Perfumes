'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { CONCENTRATION_LABELS } from '@/lib/commerce/labels';
import { formatPrice } from '@/lib/commerce/money';
import type { ShopFilters } from '@/lib/shop-query';
import { cn } from '@/lib/utils';

type Facets = {
  families: { slug: string; nameHe: string; _count: { products: number } }[];
  collections: { slug: string; nameHe: string; _count: { products: number } }[];
  volumes: number[];
  concentrations: string[];
  minPriceAgorot: number;
  maxPriceAgorot: number;
};

/**
 * Filter panel.
 *
 * State lives entirely in the URL, so every filtered view is shareable and the
 * browser's back button behaves. On mobile it becomes a drawer that enters from
 * the inline-start edge (the right, in Hebrew).
 */
export function ShopFilterPanel({ facets, filters }: { facets: Facets; filters: ShopFilters }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggleValue = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const current = next.getAll(key).flatMap((entry) => entry.split(','));

    const updated = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];

    next.delete(key);
    if (updated.length > 0) next.set(key, updated.join(','));
    next.delete('page');

    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const toggleFlag = (key: string, enabled: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (enabled) next.set(key, '1');
    else next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const isChecked = (key: string, value: string) =>
    searchParams.getAll(key).flatMap((entry) => entry.split(',')).includes(value);

  const body = (
    <div className="flex flex-col gap-8">
      <Group title="משפחת ניחוח">
        {facets.families.map((family) => (
          <CheckboxRow
            key={family.slug}
            label={family.nameHe}
            count={family._count.products}
            checked={isChecked('family', family.slug)}
            onChange={() => toggleValue('family', family.slug)}
          />
        ))}
      </Group>

      {facets.collections.length > 0 && (
        <Group title="קולקציה">
          {facets.collections.map((collection) => (
            <CheckboxRow
              key={collection.slug}
              label={collection.nameHe}
              count={collection._count.products}
              checked={isChecked('collection', collection.slug)}
              onChange={() => toggleValue('collection', collection.slug)}
            />
          ))}
        </Group>
      )}

      {facets.concentrations.length > 0 && (
        <Group title="ריכוז">
          {facets.concentrations.map((concentration) => (
            <CheckboxRow
              key={concentration}
              label={CONCENTRATION_LABELS[concentration] ?? concentration}
              checked={isChecked('concentration', concentration)}
              onChange={() => toggleValue('concentration', concentration)}
            />
          ))}
        </Group>
      )}

      {facets.volumes.length > 0 && (
        <Group title="נפח">
          {facets.volumes.map((volume) => (
            <CheckboxRow
              key={volume}
              label={`${volume} מ״ל`}
              checked={isChecked('volume', String(volume))}
              onChange={() => toggleValue('volume', String(volume))}
            />
          ))}
        </Group>
      )}

      <Group title="זמינות">
        <CheckboxRow
          label="במלאי בלבד"
          checked={filters.inStockOnly}
          onChange={() => toggleFlag('inStock', !filters.inStockOnly)}
        />
        <CheckboxRow
          label="חדשים"
          checked={filters.newArrivalsOnly}
          onChange={() => toggleFlag('new', !filters.newArrivalsOnly)}
        />
        <CheckboxRow
          label="במבצע"
          checked={filters.onSaleOnly}
          onChange={() => toggleFlag('sale', !filters.onSaleOnly)}
        />
      </Group>

      {facets.maxPriceAgorot > 0 && (
        <Group title="טווח מחירים">
          <p className="text-xs text-faint">
            <span className="ltr-nums">{formatPrice(facets.minPriceAgorot)}</span>
            {' – '}
            <span className="ltr-nums">{formatPrice(facets.maxPriceAgorot)}</span>
          </p>
        </Group>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="filter-drawer"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-gold/30 px-4 text-sm text-cream lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        סינון
      </button>

      {/* Desktop sidebar */}
      <aside aria-label="מסנני קטלוג" className="hidden lg:block">
        {body}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/80"
            onClick={() => setOpen(false)}
            aria-label="סגירת המסננים"
            tabIndex={-1}
          />
          <div
            id="filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="מסנני קטלוג"
            className="absolute inset-block-0 inset-inline-start-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto border-inline-end border-gold/20 bg-charcoal p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-ivory">סינון</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center text-cream hover:text-ivory"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">סגירה</span>
              </button>
            </div>
            <div className="mt-6">{body}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="font-serif text-sm tracking-wide text-gold">{title}</legend>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </fieldset>
  );
}

function CheckboxRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream/85 hover:text-ivory">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[var(--color-gold)]"
      />
      <span className={cn('flex-1', checked && 'text-ivory')}>{label}</span>
      {count !== undefined && <span className="ltr-nums text-xs text-faint">{count}</span>}
    </label>
  );
}
