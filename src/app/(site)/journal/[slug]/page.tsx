import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatDateHe } from '@/lib/utils';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.journalPost.findFirst({
    where: { slug, isPublished: true },
    select: { titleHe: true, excerptHe: true },
  });
  if (!post) return { title: 'הכתבה לא נמצאה' };
  return { title: post.titleHe, description: post.excerptHe ?? undefined };
}

export default async function JournalPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await db.journalPost.findFirst({ where: { slug, isPublished: true } });
  if (!post) notFound();

  return (
    <article className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">{post.titleHe}</h1>
        {post.publishedAt && (
          <p className="mt-3 text-sm text-muted">{formatDateHe(post.publishedAt)}</p>
        )}
        <div className="mt-8 flex flex-col gap-4 text-base leading-relaxed text-cream/85">
          {post.bodyHe.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  );
}
