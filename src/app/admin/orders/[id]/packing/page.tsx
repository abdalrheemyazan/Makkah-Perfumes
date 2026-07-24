import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTimeHe } from '@/lib/utils';
import { DELIVERY_METHOD_LABELS } from '@/lib/commerce/labels';
import { PrintButton } from '@/components/admin/print-button';

export const metadata: Metadata = { title: 'תעודת ליקוט', robots: { index: false } };

type Params = Promise<{ id: string }>;

/**
 * Print-friendly packing slip.
 *
 * Deliberately light-on-white rather than the admin's dark theme: this page is
 * meant for paper, and printing the dark UI would waste toner and read poorly.
 * Prices are omitted — a picker needs items and quantities, not totals.
 */
export default async function PackingSlip({ params }: { params: Params }) {
  await requireCapability('orders.write');
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, shippingAddress: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl rounded-sm bg-white p-8 text-black print:max-w-none print:p-0">
      <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-bold">תעודת ליקוט</h1>
          <p className="ltr-nums mt-1 text-lg" dir="ltr">
            {order.orderNumber}
          </p>
          <p className="mt-1 text-sm">{formatDateTimeHe(order.placedAt)}</p>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </div>

      {order.isDevelopmentOrder && (
        <p className="mt-4 border-2 border-black p-3 text-sm font-bold">
          ⚠ הזמנת פיתוח — אין לשלוח בפועל.
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="text-sm font-bold uppercase">כתובת למשלוח</h2>
          {order.shippingAddress ? (
            <address className="mt-2 text-sm leading-relaxed not-italic">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.street} {order.shippingAddress.houseNumber}
              {order.shippingAddress.apartment && `, דירה ${order.shippingAddress.apartment}`}
              {order.shippingAddress.entrance && `, כניסה ${order.shippingAddress.entrance}`}
              {order.shippingAddress.floor && `, קומה ${order.shippingAddress.floor}`}
              <br />
              {order.shippingAddress.city}
              {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
              <br />
              <span dir="ltr">{order.shippingAddress.phone}</span>
            </address>
          ) : (
            <p className="mt-2 text-sm">—</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase">אופן משלוח</h2>
          <p className="mt-2 text-sm">{DELIVERY_METHOD_LABELS[order.deliveryMethod]}</p>
          {order.customerNote && (
            <>
              <h2 className="mt-4 text-sm font-bold uppercase">הערת לקוח</h2>
              <p className="mt-1 text-sm">{order.customerNote}</p>
            </>
          )}
        </section>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th scope="col" className="py-2 text-start">
              ✓
            </th>
            <th scope="col" className="py-2 text-start">
              מוצר
            </th>
            <th scope="col" className="py-2 text-start">
              מק״ט
            </th>
            <th scope="col" className="py-2 text-start">
              כמות
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-black/30">
              <td className="py-3">
                <span className="inline-block h-5 w-5 border-2 border-black" aria-hidden="true" />
              </td>
              <td className="py-3">
                <span className="font-medium">{item.productNameHe}</span>
                <span className="block text-xs" dir="ltr">
                  {item.productNameEn}
                </span>
                <span className="block text-xs">{item.variantLabel}</span>
              </td>
              <td className="ltr-nums py-3 text-xs" dir="ltr">
                {item.variantSku}
              </td>
              <td className="ltr-nums py-3 text-lg font-bold">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="ltr-nums mt-6 text-sm">
        סה״כ פריטים: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
      </p>

      {order.internalNote && (
        <section className="mt-6 border-t border-black pt-4">
          <h2 className="text-sm font-bold uppercase">הערה פנימית</h2>
          <p className="mt-1 text-sm">{order.internalNote}</p>
        </section>
      )}
    </div>
  );
}
