import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { CouponForm, type CouponDraft } from '@/components/admin/coupon-form';

export const metadata: Metadata = { title: 'קופון חדש' };

const EMPTY: CouponDraft = {
  id: null,
  code: '',
  descriptionHe: '',
  discountType: 'PERCENTAGE',
  discountValueDisplay: '',
  minSubtotalShekels: '',
  usageLimit: '',
  perUserLimit: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export default async function NewCouponPage() {
  await requireCapability('coupons.write');
  return (
    <div>
      <PageHeader titleHe="קופון חדש" descriptionHe="יצירת קופון הנחה חדש." />
      <div className="mt-4">
        <Link href="/admin/coupons" className="text-sm text-gold hover:text-cream">
          ← לכל הקופונים
        </Link>
      </div>
      <CouponForm draft={EMPTY} />
    </div>
  );
}
