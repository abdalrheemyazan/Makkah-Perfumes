'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Heart } from 'lucide-react';
import { toggleWishlist } from '@/app/actions/wishlist';
import { WISHLIST_INITIAL } from '@/lib/action-state';
import { cn } from '@/lib/utils';

export function WishlistButton({
  productId,
  productNameHe,
  initiallySaved = false,
}: {
  productId: string;
  productNameHe: string;
  initiallySaved?: boolean;
}) {
  const [state, formAction] = useActionState(toggleWishlist, WISHLIST_INITIAL);

  const saved =
    state.status === 'added' ? true : state.status === 'removed' ? false : initiallySaved;

  return (
    <form action={formAction} className="relative z-10">
      <input type="hidden" name="productId" value={productId} />
      <Toggle saved={saved} productNameHe={productNameHe} />

      {state.status === 'error' && (
        <p role="alert" className="absolute end-0 mt-1 w-40 rounded-sm bg-ink/95 p-2 text-end text-[0.7rem] text-danger">
          {state.messageHe}
        </p>
      )}
    </form>
  );
}

function Toggle({ saved, productNameHe }: { saved: boolean; productNameHe: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={saved}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full border backdrop-blur-sm transition-colors',
        saved
          ? 'border-gold/60 bg-ink/80 text-gold'
          : 'border-gold/20 bg-ink/60 text-cream hover:border-gold/50 hover:text-gold',
      )}
    >
      <Heart className="h-4 w-4" aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
      <span className="sr-only">
        {saved ? `הסרת ${productNameHe} מרשימת המשאלות` : `הוספת ${productNameHe} לרשימת המשאלות`}
      </span>
    </button>
  );
}
