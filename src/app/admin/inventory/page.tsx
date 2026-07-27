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

  const [items, movements, restockSubs] = await Promise.all([
    db.inventoryItem.findMany({
      include: { variant: { include: { product: true } } },
      orderBy: { quantityOnHand: 'asc' },
    }),
    db.inventoryMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { inventoryItem: { include: { variant: { include: { product: true } } } } },
    }),
    // Restock alert subscriptions (Part 11) — everything except cancelled ones.
    db.restockSubscription.findMany({
      where: { status: { not: 'UNSUBSCRIBED' } },
      select: {
        productId: true,
        status: true,
        notifiedAt: true,
        product: { select: { nameHe: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Aggregate restock subscriptions per product: active count, notified count,
  // and the most recent notification date.
  type RestockAgg = { nameHe: string; active: number; notified: number; lastNotifiedAt: Date | null };
  const restockByProduct = new Map<string, RestockAgg>();
  for (const sub of restockSubs) {
    const entry = restockByProduct.get(sub.productId) ?? {
      nameHe: sub.product.nameHe,
      active: 0,
      notified: 0,
      lastNotifiedAt: null,
    };
    if (sub.status === 'ACTIVE') entry.active += 1;
    if (sub.status === 'NOTIFIED') {
      entry.notified += 1;
      if (sub.notifiedAt && (!entry.lastNotifiedAt || sub.notifiedAt > entry.lastNotifiedAt)) {
        entry.lastNotifiedAt = sub.notifiedAt;
      }
    }
    restockByProduct.set(sub.productId, entry);
  }
  const activeByProduct = new Map<string, number>(
    [...restockByProduct.entries()].map(([id, agg]) => [id, agg.active]),
  );
  const restockRows = [...restockByProduct.entries()]
    .filter(([, agg]) => agg.active > 0 || agg.notified > 0)
    .sort((a, b) => b[1].active - a[1].active);

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
        <Table headers={['מוצר', 'מק״ט', 'במלאי', 'משוריין', 'זמין', 'סף', 'מנויים', 'התאמה']}>
          {items.map((item) => {
            const available = item.quantityOnHand - item.quantityReserved;
            const low = available <= item.lowStockThreshold;
            const activeSubs = activeByProduct.get(item.variant.productId) ?? 0;
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
                <Cell labelHe="מנויים">
                  {activeSubs > 0 ? (
                    <Badge tone={available <= 0 ? 'warning' : 'neutral'}>
                      <span className="ltr-nums">{activeSubs}</span>
                    </Badge>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
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
        <Card
          titleHe="בקשות עדכון חזרה למלאי"
          descriptionHe="לקוחות שביקשו לקבל התראה כשמוצר יחזור למלאי. ההתראות נשלחות אוטומטית במעבר מ־0 לזמין."
        >
          {restockRows.length === 0 ? (
            <EmptyState
              titleHe="אין בקשות עדכון"
              descriptionHe="כשמוצר יאזל, לקוחות יוכלו לבקש עדכון מעמוד המוצר."
            />
          ) : (
            <Table headers={['מוצר', 'ממתינים', 'עודכנו', 'עדכון אחרון']}>
              {restockRows.map(([productId, agg]) => (
                <Row key={productId}>
                  <Cell labelHe="מוצר">
                    <span className="text-ivory">{agg.nameHe}</span>
                  </Cell>
                  <Cell labelHe="ממתינים">
                    {agg.active > 0 ? (
                      <Badge tone="gold">
                        <span className="ltr-nums">{agg.active}</span>
                      </Badge>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </Cell>
                  <Cell labelHe="עודכנו">
                    <span className="ltr-nums text-muted">{agg.notified}</span>
                  </Cell>
                  <Cell labelHe="עדכון אחרון">
                    <span className="text-xs text-faint">
                      {agg.lastNotifiedAt ? formatDateTimeHe(agg.lastNotifiedAt) : '—'}
                    </span>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      </div>

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
