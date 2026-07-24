import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateHe } from '@/lib/utils';
import { Badge, Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { ReviewModerationForm } from '@/components/admin/review-moderation';

export const metadata: Metadata = { title: 'ביקורות' };

export default async function AdminReviewsPage() {
  await requireCapability('reviews.moderate');

  const reviews = await db.review.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      product: { select: { nameHe: true, slug: true } },
      user: { select: { email: true, firstName: true } },
    },
  });

  const pending = reviews.filter((review) => review.status === 'PENDING').length;

  return (
    <div>
      <PageHeader
        titleHe="ביקורות"
        descriptionHe={
          reviews.length === 0
            ? 'רק ביקורות אמיתיות שנכתבו על ידי לקוחות מוצגות באתר.'
            : `${reviews.length} ביקורות · ${pending} ממתינות לאישור`
        }
      />

      {reviews.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            titleHe="אין ביקורות במערכת"
            descriptionHe="לא נוצרו ביקורות לדוגמה במכוון. ביקורות יופיעו כאן כאשר לקוחות אמיתיים יכתבו אותן, ורק לאחר אישור כאן הן יוצגו באתר."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/shop/${review.product.slug}`}
                    className="text-sm text-ivory hover:text-gold"
                  >
                    {review.product.nameHe}
                  </Link>
                  <p
                    className="ltr-nums mt-1 text-gold"
                    aria-label={`דירוג ${review.rating} מתוך 5`}
                  >
                    {'★'.repeat(review.rating)}
                  </p>
                </div>
                <Badge
                  tone={
                    review.status === 'APPROVED'
                      ? 'success'
                      : review.status === 'REJECTED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {review.status === 'APPROVED'
                    ? 'מאושרת'
                    : review.status === 'REJECTED'
                      ? 'נדחתה'
                      : 'ממתינה'}
                </Badge>
              </div>

              {review.titleHe && (
                <h3 className="mt-3 font-serif text-base text-ivory">{review.titleHe}</h3>
              )}
              <p className="mt-2 text-sm leading-relaxed text-cream/85">{review.bodyHe}</p>
              <p className="mt-3 text-xs text-faint">
                {review.user?.firstName ?? review.user?.email ?? 'אנונימי'} ·{' '}
                {formatDateHe(review.createdAt)}
                {review.orderId ? ' · רכישה מאומתת' : ' · ללא רכישה מאומתת'}
              </p>

              <div className="mt-4 border-t border-gold/10 pt-4">
                <ReviewModerationForm reviewId={review.id} status={review.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
