'use client';

import { useId } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/** Submits to /search as a real GET form, so results are linkable. */
export function SearchBox({ defaultValue }: { defaultValue: string }) {
  const id = useId();
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('q');
        const query = String(value ?? '').trim();
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
      }}
    >
      <label htmlFor={id} className="block text-sm text-cream">
        חיפוש מוצרים
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoComplete="off"
          placeholder="למשל: עוד, לבונה, ורד"
          className="h-11 min-w-0 flex-1 rounded-sm border border-gold/25 bg-ink px-3 text-sm text-ivory placeholder:text-faint focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-gold px-5 text-sm font-medium text-ink transition-colors hover:bg-cream"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          חיפוש
        </button>
      </div>
    </form>
  );
}
