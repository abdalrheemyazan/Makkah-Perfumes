import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { agorotToShekels } from '@/lib/commerce/money';
import { PageHeader } from '@/components/admin/ui';
import { CouponForm, type CouponDraft } from '@/components/admin/coupon-form';

export const metadata: Metadata = { title: 'עריכת קופון' };

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('coupons.write');
  const { id } = await params;

  const coupon = await db.coupon.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!coupon) notFound();

  const draft: CouponDraft = {
    id: coupon.id,
    code: coupon.code,
    descriptionHe: coupon.descriptionHe ?? '',
    discountType: coupon.discountType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE',
    discountValueDisplay:
      coupon.discountType === 'FIXED_AMOUNT'
        ? String(agorotToShekels(coupon.discountValue))
        : String(coupon.discountValue),
    minSubtotalShekels: coupon.minSubtotalAgorot != null ? String(agorotToShekels(coupon.minSubtotalAgorot)) : '',
    usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
    perUserLimit: coupon.perUserLimit != null ? String(coupon.perUserLimit) : '',
    startsAt: toDateInput(coupon.startsAt),
    endsAt: toDateInput(coupon.endsAt),
    isActive: coupon.isActive,
  };

  return (
    <div>
      <PageHeader
        titleHe="עריכת קופון"
        descriptionHe={`מומש ${coupon._count.redemptions} פעמים · נעשה בו שימוש ${coupon.usageCount} פעמים.`}
      />
      <div className="mt-4">
        <Link href="/admin/coupons" className="text-sm text-gold hover:text-cream">
          ← לכל הקופונים
        </Link>
      </div>
      <CouponForm draft={draft} />
    </div>
  );
}
