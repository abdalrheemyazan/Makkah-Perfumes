'use client';

import { useId } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function SortSelect({
  current,
  options,
}: {
  current: string;
  options: readonly { value: string; labelHe: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();

  const onChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'recommended') next.delete('sort');
    else next.set('sort', value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted">
        מיון
      </label>
      <select
        id={id}
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-sm border border-gold/25 bg-charcoal px-3 text-sm text-cream focus:border-gold focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.labelHe}
          </option>
        ))}
      </select>
    </div>
  );
}
