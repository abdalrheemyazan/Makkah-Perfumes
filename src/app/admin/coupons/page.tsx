import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { DISCOUNT_TYPE_LABELS } from '@/lib/admin/labels';
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'קופונים' };

export default async function AdminCouponsPage() {
  await requireCapability('coupons.write');

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  });

  return (
    <div>
      <PageHeader titleHe="קופונים" descriptionHe={`${coupons.length} קופונים במערכת`} />

      {coupons.length === 0 ? (
        <div className="mt-8">
          <EmptyState titleHe="אין קופונים" />
        </div>
      ) : (
        <Table headers={['קוד', 'סוג', 'ערך', 'מימושים', 'תוקף', 'סטטוס']}>
          {coupons.map((coupon) => {
            const expired = coupon.endsAt != null && coupon.endsAt < new Date();
            const exhausted = coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit;
            return (
              <Row key={coupon.id}>
                <Cell labelHe="קוד">
                  <span className="text-ivory" dir="ltr">
                    {coupon.code}
                  </span>
                </Cell>
                <Cell labelHe="סוג">
                  <span className="text-xs text-muted">
                    {DISCOUNT_TYPE_LABELS[coupon.discountType]}
                  </span>
                </Cell>
                <Cell labelHe="ערך">
                  <span className="ltr-nums">
                    {coupon.discountType === 'PERCENTAGE'
                      ? `${coupon.discountValue}%`
                      : coupon.discountType === 'FIXED_AMOUNT'
                        ? formatPrice(coupon.discountValue)
                        : '—'}
                  </span>
                </Cell>
                <Cell labelHe="מימושים">
                  <span className="ltr-nums">
                    {coupon._count.redemptions}
                    {coupon.usageLimit != null && ` / ${coupon.usageLimit}`}
                  </span>
                </Cell>
                <Cell labelHe="תוקף">
                  <span className="text-xs text-muted">
                    {coupon.endsAt ? formatDateHe(coupon.endsAt) : 'ללא הגבלה'}
                  </span>
                </Cell>
                <Cell labelHe="סטטוס">
                  <Badge tone={!coupon.isActive || expired || exhausted ? 'neutral' : 'success'}>
                    {!coupon.isActive
                      ? 'מושבת'
                      : expired
                        ? 'פג תוקף'
                        : exhausted
                          ? 'מוצה'
                          : 'פעיל'}
                  </Badge>
                </Cell>
              </Row>
            );
          })}
        </Table>
      )}
    </div>
  );
}
