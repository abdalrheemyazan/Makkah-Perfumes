import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/commerce/money';
import { formatDateHe } from '@/lib/utils';
import { AdminButtonLink, Badge, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';
import { CouponToggle } from '@/components/admin/coupon-form';

export const metadata: Metadata = { title: 'קופונים' };

export default async function AdminCouponsPage() {
  await requireCapability('coupons.write');

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  });

  return (
    <div>
      <PageHeader
        titleHe="קופונים"
        descriptionHe={`${coupons.length} קופונים. קופון שמומש אינו נמחק — ניתן להשבית אותו.`}
        action={<AdminButtonLink href="/admin/coupons/new">קופון חדש</AdminButtonLink>}
      />

      {coupons.length === 0 ? (
        <div className="mt-8">
          <EmptyState titleHe="אין קופונים" descriptionHe="צרו קופון ראשון כדי להעניק הנחות." />
        </div>
      ) : (
        <Table headers={['קוד', 'הנחה', 'תוקף', 'שימוש', 'סטטוס', 'מימושים', '']}>
          {coupons.map((coupon) => (
            <Row key={coupon.id}>
              <Cell labelHe="קוד">
                <Link href={`/admin/coupons/${coupon.id}`} className="ltr-nums text-ivory hover:text-gold" dir="ltr">
                  {coupon.code}
                </Link>
                {coupon.descriptionHe && <p className="text-xs text-faint">{coupon.descriptionHe}</p>}
              </Cell>
              <Cell labelHe="הנחה">
                {coupon.discountType === 'PERCENTAGE' ? (
                  <span className="ltr-nums">{coupon.discountValue}%</span>
                ) : (
                  <span className="ltr-nums">{formatPrice(coupon.discountValue)}</span>
                )}
              </Cell>
              <Cell labelHe="תוקף">
                <span className="text-xs text-muted">
                  {coupon.endsAt ? `עד ${formatDateHe(coupon.endsAt)}` : 'ללא תפוגה'}
                </span>
              </Cell>
              <Cell labelHe="שימוש">
                <span className="ltr-nums text-xs text-muted">
                  {coupon.usageCount}
                  {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ''}
                </span>
              </Cell>
              <Cell labelHe="סטטוס">
                <Badge tone={coupon.isActive ? 'success' : 'neutral'}>
                  {coupon.isActive ? 'פעיל' : 'מושבת'}
                </Badge>
              </Cell>
              <Cell labelHe="מימושים">
                <span className="ltr-nums text-muted">{coupon._count.redemptions}</span>
              </Cell>
              <Cell labelHe="">
                <div className="flex items-center gap-3">
                  <Link href={`/admin/coupons/${coupon.id}`} className="text-sm text-gold hover:text-cream">
                    עריכה
                  </Link>
                  <CouponToggle id={coupon.id} isActive={coupon.isActive} />
                </div>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}
