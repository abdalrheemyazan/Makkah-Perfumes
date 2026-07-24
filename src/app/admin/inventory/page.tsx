import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTimeHe } from '@/lib/utils';
import { MOVEMENT_REASON_LABELS } from '@/lib/admin/labels';
import { Badge, Card, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';
import { InventoryAdjustForm } from '@/components/admin/inventory-adjust-form';

export const metadata: Metadata = { title: 'מלאי' };

export default async function AdminInventoryPage() {
  await requireCapability('inventory.write');

  const [items, movements] = await Promise.all([
    db.inventoryItem.findMany({
      include: { variant: { include: { product: true } } },
      orderBy: { quantityOnHand: 'asc' },
    }),
    db.inventoryMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { inventoryItem: { include: { variant: { include: { product: true } } } } },
    }),
  ]);

  // Resolve actor names in one query rather than per-row.
  const actorIds = [...new Set(movements.map((m) => m.createdByUserId).filter(Boolean))] as string[];
  const actors = actorIds.length
    ? await db.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : [];
  const actorMap = new Map(
    actors.map((a) => [a.id, [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email]),
  );

  const lowCount = items.filter(
    (item) => item.quantityOnHand - item.quantityReserved <= item.lowStockThreshold,
  ).length;

  return (
    <div>
      <PageHeader
        titleHe="מלאי"
        descriptionHe={`${items.length} פריטים · ${lowCount} במלאי נמוך. כל שינוי נרשם עם סיבה ומבצע.`}
      />

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState titleHe="אין פריטי מלאי" descriptionHe="צרו מוצר כדי לנהל מלאי." />
        </div>
      ) : (
        <Table headers={['מוצר', 'מק״ט', 'במלאי', 'משוריין', 'זמין', 'סף', 'התאמה']}>
          {items.map((item) => {
            const available = item.quantityOnHand - item.quantityReserved;
            const low = available <= item.lowStockThreshold;
            return (
              <Row key={item.id}>
                <Cell labelHe="מוצר">
                  <Link
                    href={`/admin/products/${item.variant.productId}`}
                    className="text-ivory hover:text-gold"
                  >
                    {item.variant.product.nameHe}
                  </Link>
                </Cell>
                <Cell labelHe="מק״ט">
                  <span className="ltr-nums text-xs" dir="ltr">
                    {item.variant.sku}
                  </span>
                </Cell>
                <Cell labelHe="במלאי">
                  <span className="ltr-nums">{item.quantityOnHand}</span>
                </Cell>
                <Cell labelHe="משוריין">
                  <span className="ltr-nums text-muted">{item.quantityReserved}</span>
                </Cell>
                <Cell labelHe="זמין">
                  <Badge tone={available <= 0 ? 'danger' : low ? 'warning' : 'success'}>
                    <span className="ltr-nums">{available}</span>
                  </Badge>
                </Cell>
                <Cell labelHe="סף">
                  <span className="ltr-nums text-muted">{item.lowStockThreshold}</span>
                </Cell>
                <Cell labelHe="התאמה">
                  <InventoryAdjustForm
                    inventoryItemId={item.id}
                    productNameHe={item.variant.product.nameHe}
                  />
                </Cell>
              </Row>
            );
          })}
        </Table>
      )}

      <div className="mt-10">
        <Card titleHe="היסטוריית תנועות" descriptionHe="25 התנועות האחרונות">
          {movements.length === 0 ? (
            <EmptyState titleHe="אין תנועות מלאי" />
          ) : (
            <ul className="flex flex-col divide-y divide-gold/10">
              {movements.map((movement) => (
                <li key={movement.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-cream">
                      {movement.inventoryItem.variant.product.nameHe}
                    </p>
                    <p className="text-xs text-faint">
                      {MOVEMENT_REASON_LABELS[movement.reason] ?? movement.reason}
                      {movement.note && ` · ${movement.note}`}
                    </p>
                    <p className="text-xs text-faint">
                      {formatDateTimeHe(movement.createdAt)}
                      {movement.createdByUserId && (
                        <> · {actorMap.get(movement.createdByUserId) ?? 'משתמש שנמחק'}</>
                      )}
                      {!movement.createdByUserId && ' · מערכת'}
                    </p>
                  </div>
                  <span
                    className={`ltr-nums shrink-0 font-medium ${
                      movement.delta > 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {movement.delta > 0 ? '+' : ''}
                    {movement.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
