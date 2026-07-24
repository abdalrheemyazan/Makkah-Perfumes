/** Prints recent orders and inventory reservations. Development diagnostic. */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const orders = await db.order.findMany({
  include: { items: true, payments: true },
  orderBy: { placedAt: 'desc' },
  take: 3,
});

console.log(`total orders: ${await db.order.count()}`);
for (const o of orders) {
  console.log(`\n${o.orderNumber} | status=${o.status} payment=${o.paymentStatus} dev=${o.isDevelopmentOrder}`);
  console.log(`  subtotal=${o.subtotalAgorot} shipping=${o.shippingAgorot} total=${o.totalAgorot} (agorot)`);
  for (const i of o.items) {
    console.log(`  item: ${i.productNameEn} x${i.quantity} @${i.unitPriceAgorot} = ${i.lineTotalAgorot}`);
  }
  for (const p of o.payments) {
    console.log(`  payment: ${p.provider} ${p.status} ref=${p.providerReference}`);
  }
}

console.log('\n--- reserved stock ---');
const inv = await db.inventoryItem.findMany({
  where: { quantityReserved: { gt: 0 } },
  include: { variant: true },
});
for (const i of inv) {
  console.log(`  ${i.variant.sku}: onHand=${i.quantityOnHand} reserved=${i.quantityReserved}`);
}
console.log('ORDER_RESERVED movements:', await db.inventoryMovement.count({ where: { reason: 'ORDER_RESERVED' } }));

await db.$disconnect();
