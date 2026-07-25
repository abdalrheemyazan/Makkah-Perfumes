import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { PageIdentity } from '@/components/layout/page-identity';
import { ButtonLink } from '@/components/ui/button';
import { formatDateHe } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'מגזין',
  description: 'כתבות על חומרי גלם, מסורות בישום ודרכי שימוש.',
  alternates: { canonical: '/journal' },
};

export default async function JournalPage() {
  const posts = await db.journalPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      titleHe: true,
      excerptHe: true,
      coverImageUrl: true,
      coverAltHe: true,
      publishedAt: true,
      authorName: true,
    },
  });

  return (
    <>
      <PageIdentity
        titleHe="המגזין"
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: 'מגזין' }]}
        descriptionHe="כתבות על חומרי גלם, מסורות בישום ודרכי שימוש."
      />
      <div className="container-editorial pt-10 pb-24">
        {posts.length === 0 ? (
          <div className="rounded-lg border border-gold/15 bg-charcoal p-10 text-center">
            <p className="text-xl font-semibold text-ivory">עדיין לא פורסמו כתבות</p>
            <p className="mt-2 text-sm text-muted">
              כתבות חדשות יופיעו כאן. בינתיים אפשר לגלות את הקולקציה.
            </p>
            <div className="mt-6">
              <ButtonLink href="/shop">לגילוי הקולקציה</ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/journal/${post.slug}`}
                  className="group block overflow-hidden rounded-lg border border-gold/12 bg-charcoal/70 transition-colors hover:border-gold/40"
                >
                  <div className="relative aspect-4/3 bg-charcoal">
                    {post.coverImageUrl && (
                      <Image
                        src={post.coverImageUrl}
                        alt={post.coverAltHe ?? ''}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-ivory">{post.titleHe}</h2>
                    {post.excerptHe && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-cream/75">
                        {post.excerptHe}
                      </p>
                    )}
                    <p className="mt-4 text-xs text-faint">
                      {post.publishedAt && formatDateHe(post.publishedAt)}
                      {post.authorName ? ` · ${post.authorName}` : ''}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
