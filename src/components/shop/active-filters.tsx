'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { CONCENTRATION_LABELS } from '@/lib/commerce/labels';
import type { ShopFilters } from '@/lib/shop-query';

type Facets = {
  families: { slug: string; nameHe: string }[];
  collections: { slug: string; nameHe: string }[];
};

type Chip = { key: string; value: string; labelHe: string };

/** Shows which filters are active and lets each one be removed individually. */
export function ActiveFilterChips({
  filters,
  facets,
}: {
  filters: ShopFilters;
  facets: Facets;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: Chip[] = [
    ...filters.families.map((slug) => ({
      key: 'family',
      value: slug,
      labelHe: facets.families.find((f) => f.slug === slug)?.nameHe ?? slug,
    })),
    ...filters.collections.map((slug) => ({
      key: 'collection',
      value: slug,
      labelHe: facets.collections.find((c) => c.slug === slug)?.nameHe ?? slug,
    })),
    ...filters.concentrations.map((value) => ({
      key: 'concentration',
      value,
      labelHe: CONCENTRATION_LABELS[value] ?? value,
    })),
    ...filters.volumes.map((volume) => ({
      key: 'volume',
      value: String(volume),
      labelHe: `${volume} מ״ל`,
    })),
    ...(filters.inStockOnly ? [{ key: 'inStock', value: '1', labelHe: 'במלאי בלבד' }] : []),
    ...(filters.newArrivalsOnly ? [{ key: 'new', value: '1', labelHe: 'חדשים' }] : []),
    ...(filters.onSaleOnly ? [{ key: 'sale', value: '1', labelHe: 'במבצע' }] : []),
    ...(filters.query ? [{ key: 'q', value: filters.query, labelHe: `חיפוש: ${filters.query}` }] : []),
  ];

  if (chips.length === 0) return <div />;

  const removeChip = (chip: Chip) => {
    const next = new URLSearchParams(searchParams.toString());
    const current = next.getAll(chip.key).flatMap((entry) => entry.split(','));
    const remaining = current.filter((entry) => entry !== chip.value);

    next.delete(chip.key);
    if (remaining.length > 0) next.set(chip.key, remaining.join(','));
    next.delete('page');

    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const clearAll = () => router.push(pathname, { scroll: false });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">מסננים פעילים</span>
      {chips.map((chip) => (
        <button
          key={`${chip.key}:${chip.value}`}
          type="button"
          onClick={() => removeChip(chip)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 px-3 py-1 text-xs text-cream hover:border-gold hover:text-ivory"
        >
          {chip.labelHe}
          <X className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">הסרת המסנן {chip.labelHe}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs text-muted underline underline-offset-2 hover:text-ivory"
      >
        ניקוי הכול
      </button>
    </div>
  );
}
