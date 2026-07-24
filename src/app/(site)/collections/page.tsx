import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'קולקציות',
  description: 'הקולקציות של מכה פרפיומס, מסודרות לפי שפת העיצוב של הבקבוק.',
};

export default async function CollectionsPage() {
  const collections = await db.collection.findMany({
    where: { isPublished: true },
    orderBy: { position: 'asc' },
    include: {
      products: {
        take: 1,
        include: {
          product: {
            select: { images: { where: { isPrimary: true }, take: 1 } },
          },
        },
      },
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="container-editorial pt-32 pb-24">
      <h1 className="font-serif text-4xl text-ivory sm:text-5xl">קולקציות</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        הקולקציות מקובצות לפי שפת העיצוב של הבקבוק — כפי שהיא נראית בפועל על המוצר.
      </p>

      {collections.length === 0 ? (
        <p className="mt-10 text-muted">טרם פורסמו קולקציות.</p>
      ) : (
        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {collections.map((collection) => {
            const image = collection.products[0]?.product.images[0];
            return (
              <li key={collection.id}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="group block overflow-hidden rounded-sm border border-gold/15 bg-charcoal transition-colors hover:border-gold/40"
                >
                  <div className="relative aspect-4/3">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={image.altHe}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-contain p-8 transition-transform duration-700 motion-safe:group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-faint">
                        אין תמונה
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h2 className="font-serif text-2xl text-ivory">{collection.nameHe}</h2>
                    {collection.descriptionHe && (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {collection.descriptionHe}
                      </p>
                    )}
                    <p className="mt-4 text-xs text-faint">
                      <span className="ltr-nums">{collection._count.products}</span> בשמים
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
