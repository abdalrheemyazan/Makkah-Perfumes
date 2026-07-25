import { formatPrice } from '@/lib/commerce/money';
import { cn } from '@/lib/utils';

/**
 * Renders a price.
 *
 * When `verified` is false the price is a development placeholder, and we say so
 * in the interface rather than passing it off as a real retail price.
 * See docs/MISSING_BUSINESS_DATA.md §1.1.
 */
export function Price(props: {
  agorot: number;
  compareAtAgorot?: number | null;
  verified: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { agorot, compareAtAgorot, className, size = 'md' } = props;
  const onSale = compareAtAgorot != null && compareAtAgorot > agorot;
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  } as const;

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('ltr-nums font-medium text-ivory', sizes[size])}>
        {formatPrice(agorot)}
      </span>

      {onSale && (
        <>
          <span className="ltr-nums text-sm text-faint line-through" aria-hidden="true">
            {formatPrice(compareAtAgorot)}
          </span>
          <span className="sr-only">מחיר קודם {formatPrice(compareAtAgorot)}</span>
        </>
      )}
    </span>
  );
}
