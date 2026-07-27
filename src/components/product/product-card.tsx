import Link from 'next/link';
import Image from 'next/image';
import type { ProductCard as ProductCardData } from '@/lib/catalog';
import { Price } from '@/components/ui/price';
import { publicVapidKey, emailDeliveryAvailable } from '@/lib/notifications/config';
import { AddToCartButton } from './add-to-cart-button';
import { WishlistButton } from './wishlist-button';
import { RestockNotify } from './restock-notify';

/**
 * Product card.
 *
 * Everything a shopper needs — name, price, stock, family — is real text in the
 * document, never revealed only on hover. Hover adds polish, not information.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-sm border border-gold/10 bg-charcoal transition-shadow duration-500 group-hover:shadow-xl group-hover:shadow-black/40">
        <Link href={`/shop/${product.slug}`} className="block">
          {/* Fixed, responsive media height (not a tall aspect ratio) with generous
              padding, so the bottle is ~15% smaller than before and sits with real
              breathing room. object-contain keeps every bottle's true proportions;
              nothing is cropped or stretched. See CLAUDE.md §product identity. */}
          <div className="relative h-60 sm:h-[290px] lg:h-[330px]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.imageAltHe}
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain p-6 transition-transform duration-700 ease-[var(--ease-editorial)] motion-safe:group-hover:scale-[1.02]"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-faint">
                אין תמונה
              </div>
            )}
          </div>
        </Link>

        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          {product.isNewArrival && (
            <span className="rounded-sm bg-gold px-2 py-0.5 text-[0.65rem] font-medium text-ink">
              חדש
            </span>
          )}
          {!product.inStock && (
            <span className="rounded-sm bg-ink/85 px-2 py-0.5 text-[0.65rem] font-medium text-cream">
              אזל
            </span>
          )}
        </div>

        <div className="absolute top-3 end-3">
          <WishlistButton productId={product.id} productNameHe={product.nameHe} />
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        {product.familyNameHe && (
          <p className="text-xs tracking-wide text-gold/80">{product.familyNameHe}</p>
        )}

        <h3 className="mt-1 font-serif text-lg leading-snug text-ivory">
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.nameHe}
          </Link>
        </h3>

        {/* Official English name, kept exactly as printed on the bottle. */}
        <p className="mt-0.5 text-xs tracking-wide text-muted" dir="ltr" lang="en">
          {product.nameEn}
        </p>

        {product.variantLabel && (
          <p className="mt-1 text-xs text-faint">{product.variantLabel}</p>
        )}

        <div className="mt-3">
          <Price
            agorot={product.priceAgorot}
            compareAtAgorot={product.compareAtAgorot}
            verified={product.pricingVerified}
          />
        </div>

        {/* Relative + z-10 lifts the control above the card's stretched link. */}
        <div className="relative z-10 mt-4">
          {product.inStock ? (
            <AddToCartButton variantId={product.variantId} size="sm" />
          ) : (
            <RestockNotify
              productId={product.id}
              variantId={product.variantId}
              isLoggedIn={false}
              accountEmail={null}
              emailAvailable={emailDeliveryAvailable()}
              vapidPublicKey={publicVapidKey()}
              compact
            />
          )}
        </div>
      </div>
    </article>
  );
}
