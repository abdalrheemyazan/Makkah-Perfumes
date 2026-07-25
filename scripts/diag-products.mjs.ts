import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const products = await db.product.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      nameEn: true,
      slug: true,
      status: true,
      isDevelopmentData: true,
      images: { select: { id: true, isPrimary: true } },
      variants: {
        select: {
          isActive: true,
          inventoryItem: { select: { quantityOnHand: true } },
        },
      },
    },
  });

  console.log(`TOTAL products in DB: ${products.length}\n`);
  console.log('name | status | activeVar | var | primaryImg | stock | devData');
  for (const p of products) {
    const activeVariants = p.variants.filter((v) => v.isActive).length;
    const primaryImg = p.images.some((i) => i.isPrimary);
    const stock = p.variants.reduce((s, v) => s + (v.inventoryItem?.quantityOnHand ?? 0), 0);
    console.log(
      `${p.nameEn.padEnd(18)} | ${p.status.padEnd(9)} | ${activeVariants} | ${p.variants.length} | ${primaryImg ? 'yes' : 'NO '} | ${stock} | ${p.isDevelopmentData ? 'yes' : 'no'}`,
    );
  }

  const shopCount = await db.product.count({
    where: { AND: [{ status: 'PUBLISHED' }, { variants: { some: { isActive: true } } }] },
  });
  console.log(`\nShop base count (PUBLISHED + active variant): ${shopCount}`);
  console.log(`Admin total product count: ${await db.product.count()}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
