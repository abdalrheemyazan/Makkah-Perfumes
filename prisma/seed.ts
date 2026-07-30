import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  Concentration,
  ContentBlockKind,
  DiscountType,
  InventoryMovementReason,
  NoteTier,
  ProductStatus,
  RoleName,
} from '../src/generated/prisma/enums';
import {
  FRAGRANCE_CONTENT_BY_SLUG,
  FRAGRANCE_FAMILIES,
} from '../src/lib/fragrance-content';

/**
 * Development seed.
 *
 * WHAT IS REAL HERE:
 *   - The 13 product names, their official English spelling, and their images.
 *     All read directly from the client-supplied packshots.
 *   - Volume + concentration for the six products whose label states them.
 *   - Bottle-mould groupings used for the collections.
 *
 * WHAT IS DEVELOPMENT DATA (every row below carries isDevelopmentData = true):
 *   - Prices, SKUs, stock levels, fragrance-family assignment.
 *
 * VERIFIED EDITORIAL CONTENT:
 *   - Original Hebrew descriptions plus factual fragrance family, launch year,
 *     perfumer and note structures documented in PRODUCT_CONTENT_SOURCES.md.
 *   - Reviews (no fabricated testimonials).
 *   - Branches (no invented addresses).
 *   - Any business contact or legal-entity detail that has not been verified.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ---------------------------------------------------------------------------
// Verified product identity
// ---------------------------------------------------------------------------

type SeedProduct = {
  slug: string;
  nameHe: string;
  nameEn: string;
  /** Only set where the physical label states it. */
  volumeMl: number | null;
  concentration: Concentration;
  /** Development price in agorot — NOT a real retail price. */
  devPriceAgorot: number;
  devCompareAtAgorot: number | null;
  /** Mould group, derived from the packshot. */
  mould: 'decanter' | 'marble' | 'clear-flacon' | 'cylinder' | 'standalone';
  altHe: string;
  isFeatured: boolean;
  isNewArrival: boolean;
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: 'royal-leather',
    nameHe: 'רויאל לת׳ר',
    nameEn: 'Royal Leather',
    volumeMl: null,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 44900,
    devCompareAtAgorot: null,
    mould: 'decanter',
    altHe: 'בקבוק הבושם Royal Leather — דקנטר זכוכית מסותת בגוון חום־ענבר עם פקק זהב מעוטר ותווית שחורה־זהובה',
    isFeatured: true,
    isNewArrival: false,
  },
  {
    slug: 'blossom-candy',
    nameHe: 'בלוסום קנדי',
    nameEn: 'Blossom Candy',
    volumeMl: null,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 39900,
    devCompareAtAgorot: 45900,
    mould: 'decanter',
    altHe: 'בקבוק הבושם Blossom Candy — דקנטר זכוכית מסותת במדרג שחור לאדום עם פקק זהב מעוטר',
    isFeatured: true,
    isNewArrival: true,
  },
  {
    slug: 'oud-embrace',
    nameHe: 'עוד אמברייס',
    nameEn: 'Oud Embrace',
    volumeMl: null,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 49900,
    devCompareAtAgorot: null,
    mould: 'cylinder',
    altHe: 'בקבוק הבושם Oud Embrace — גליל קריסטל מסותת בגוון ענבר עם פקק זהב גדול בצורת כתר ומדליון זהב עגול',
    isFeatured: true,
    isNewArrival: false,
  },
  {
    slug: 'luban',
    nameHe: 'לובאן',
    nameEn: 'Luban',
    volumeMl: 100,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 32900,
    devCompareAtAgorot: null,
    mould: 'standalone',
    altHe: 'בקבוק הבושם Luban — בקבוק מלבני במדרג ירוק לזהב עם איור עץ לבונה וכיתוב בערבית, פקק זהב מלבני',
    isFeatured: true,
    isNewArrival: false,
  },
  {
    slug: 'amber-incense',
    nameHe: 'אמבר אינסנס',
    nameEn: 'Amber Incense',
    volumeMl: 100,
    concentration: Concentration.EAU_DE_PARFUM,
    devPriceAgorot: 29900,
    devCompareAtAgorot: null,
    mould: 'marble',
    altHe: 'בקבוק הבושם Amber Incense — בקבוק מלבני מעוגל בגימור שיש חום עם מונוגרם זהב ופקק זהב מחורץ',
    isFeatured: true,
    isNewArrival: false,
  },
  {
    slug: 'pure-essence',
    nameHe: 'פיור אסנס',
    nameEn: 'Pure Essence',
    volumeMl: 100,
    concentration: Concentration.EAU_DE_PARFUM,
    devPriceAgorot: 27900,
    devCompareAtAgorot: null,
    mould: 'marble',
    altHe: 'בקבוק הבושם Pure Essence — בקבוק מלבני מעוגל בגימור שיש טורקיז כהה עם מונוגרם זהב ופקק זהב מחורץ',
    isFeatured: true,
    isNewArrival: true,
  },
  {
    slug: 'luxe-rose',
    nameHe: 'לוקס רוז',
    nameEn: 'Luxe Rose',
    volumeMl: 100,
    concentration: Concentration.EAU_DE_PARFUM,
    devPriceAgorot: 29900,
    devCompareAtAgorot: null,
    mould: 'marble',
    altHe: 'בקבוק הבושם Luxe Rose — בקבוק מלבני מעוגל בגימור שיש סגול עם מונוגרם זהב ופקק זהב מחורץ',
    isFeatured: false,
    isNewArrival: false,
  },
  {
    slug: 'amour-touch',
    nameHe: 'אמור טאץ׳',
    nameEn: 'Amour Touch',
    volumeMl: 100,
    concentration: Concentration.EAU_DE_PARFUM,
    devPriceAgorot: 29900,
    devCompareAtAgorot: null,
    mould: 'marble',
    altHe: 'בקבוק הבושם Amour Touch — בקבוק מלבני מעוגל בגימור שיש כחול עם מונוגרם זהב ופקק זהב מחורץ',
    isFeatured: false,
    isNewArrival: false,
  },
  {
    slug: 'adventure',
    nameHe: 'אדוונצ׳ר',
    nameEn: 'Adventure',
    volumeMl: null,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 24900,
    devCompareAtAgorot: null,
    mould: 'clear-flacon',
    altHe: 'בקבוק הבושם Adventure — פלקון זכוכית שקוף מלבני עם תווית זהב ופקק זהב גלילי מדורג',
    isFeatured: false,
    isNewArrival: false,
  },
  {
    slug: 'storm-blue',
    nameHe: 'סטורם בלו',
    nameEn: 'Storm Blue',
    volumeMl: null,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 24900,
    devCompareAtAgorot: null,
    mould: 'clear-flacon',
    altHe: 'בקבוק הבושם Storm Blue — פלקון זכוכית שקוף עם קצוות בגוון כחול כהה, תווית זהב ופקק זהב גלילי',
    isFeatured: false,
    isNewArrival: true,
  },
  {
    slug: 'courage',
    nameHe: 'קוראז׳',
    nameEn: 'Courage',
    volumeMl: 100,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 22900,
    devCompareAtAgorot: null,
    mould: 'standalone',
    altHe: 'בקבוק הבושם Courage — בקבוק מלבני מט בגוון תכלת עם פקק זהב מחורץ רחב',
    isFeatured: false,
    isNewArrival: false,
  },
  {
    slug: 'atheel',
    nameHe: 'אתיל',
    nameEn: 'Atheel',
    volumeMl: null,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 26900,
    devCompareAtAgorot: null,
    mould: 'standalone',
    altHe: 'בקבוק הבושם Atheel — בקבוק גלילי מט במדרג טורקיז לירוק עם פקק זהב מחוספס',
    isFeatured: false,
    isNewArrival: false,
  },
  {
    slug: 'precious-vanilla',
    nameHe: 'פרשס ונילה',
    nameEn: 'Precious Vanilla',
    volumeMl: null,
    concentration: Concentration.UNSPECIFIED,
    devPriceAgorot: 25900,
    devCompareAtAgorot: null,
    mould: 'standalone',
    altHe: 'בקבוק הבושם Precious Vanilla — בקבוק מלבני מעוגל בשחור מט עם לוגו כסוף ופקק כסוף',
    isFeatured: false,
    isNewArrival: false,
  },
];

const COLLECTIONS = [
  { slug: 'decanter', nameHe: 'קולקציית הדקנטר', moulds: ['decanter'],
    descriptionHe: 'בקבוקי זכוכית מסותתת בסגנון דקנטר, עם פקק זהב מעוטר.' },
  { slug: 'marble', nameHe: 'קולקציית השיש', moulds: ['marble'],
    descriptionHe: 'גימור שיש בגוונים עשירים, מונוגרם זהב ופקק מחורץ.' },
  { slug: 'crystal', nameHe: 'קולקציית הקריסטל', moulds: ['clear-flacon', 'cylinder'],
    descriptionHe: 'זכוכית שקופה וקריסטל מסותת — אור, שקיפות וקצוות חדים.' },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log('→ seeding roles');
  const roleDescriptions: Record<RoleName, string> = {
    SUPER_ADMIN: 'הרשאה מלאה, כולל ניהול משתמשים והגדרות מערכת',
    ADMIN: 'ניהול כללי של החנות',
    CONTENT_MANAGER: 'ניהול תוכן ועמודי מידע',
    ORDER_MANAGER: 'ניהול הזמנות ומשלוחים',
    INVENTORY_MANAGER: 'ניהול מלאי ומוצרים',
    SUPPORT_AGENT: 'צפייה בהזמנות ומענה ללקוחות',
    CUSTOMER: 'לקוח רשום',
  };
  for (const [name, description] of Object.entries(roleDescriptions)) {
    await db.role.upsert({
      where: { name: name as RoleName },
      update: { description },
      create: { name: name as RoleName, description },
    });
  }

  console.log('→ seeding admin user');
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@makkah.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!makkah';
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await hash(adminPassword, 12),
      firstName: 'מנהל',
      lastName: 'ראשי',
      emailVerified: new Date(),
    },
  });
  const superAdminRole = await db.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  console.log('→ seeding fragrance families');
  for (const family of FRAGRANCE_FAMILIES) {
    await db.fragranceFamily.upsert({
      where: { slug: family.slug },
      update: family,
      create: family,
    });
  }

  console.log('→ seeding category');
  const category = await db.category.upsert({
    where: { slug: 'perfumes' },
    update: {},
    create: {
      slug: 'perfumes',
      nameHe: 'בשמים',
      descriptionHe: 'כל הבשמים של מכה פרפיומס.',
      position: 1,
    },
  });

  console.log('→ seeding collections');
  for (const [index, collection] of COLLECTIONS.entries()) {
    await db.collection.upsert({
      where: { slug: collection.slug },
      update: {},
      create: {
        slug: collection.slug,
        nameHe: collection.nameHe,
        descriptionHe: collection.descriptionHe,
        isPublished: true,
        position: index + 1,
      },
    });
  }

  console.log('→ seeding products');
  for (const [index, product] of PRODUCTS.entries()) {
    const content = FRAGRANCE_CONTENT_BY_SLUG.get(product.slug);
    if (!content) throw new Error(`Missing verified fragrance content for ${product.slug}`);
    const family = await db.fragranceFamily.findUniqueOrThrow({
      where: { slug: content.family.slug },
    });

    const created = await db.product.upsert({
      where: { slug: product.slug },
      update: {
        ...(content.publicTitleHe ? { nameHe: content.publicTitleHe } : {}),
        descriptionHe: content.descriptionHe,
        fragranceFamilyId: family.id,
        notesVerified: true,
        seoDescriptionHe: content.descriptionHe,
      },
      create: {
        slug: product.slug,
        nameHe: product.nameHe,
        nameEn: product.nameEn,
        descriptionHe: content.descriptionHe,
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date(),
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        categoryId: category.id,
        fragranceFamilyId: family.id,
        notesVerified: true,
        pricingVerified: true,
        isDevelopmentData: false,
        seoTitleHe: `${product.nameHe} — ${product.nameEn} | מכה פרפיומס`,
        seoDescriptionHe: content.descriptionHe,
      },
    });

    // The current schema has three storage tiers. Flat source lists are stored
    // in TOP for relational consistency, while the public renderer uses the
    // verified KEY presentation from fragrance-content.ts and never invents a
    // public top/heart/base pyramid.
    for (const [position, sourceNote] of content.notes.entries()) {
      const noteRow = await db.fragranceNote.upsert({
        where: { slug: sourceNote.slug },
        update: { nameHe: sourceNote.nameHe, nameEn: sourceNote.nameEn },
        create: { slug: sourceNote.slug, nameHe: sourceNote.nameHe, nameEn: sourceNote.nameEn },
      });
      const tier = sourceNote.tier === 'KEY' ? NoteTier.TOP : NoteTier[sourceNote.tier];
      await db.productFragranceNote.upsert({
        where: { productId_noteId_tier: { productId: created.id, noteId: noteRow.id, tier } },
        update: { position },
        create: { productId: created.id, noteId: noteRow.id, tier, position },
      });
    }

    // Image — the real packshot, three formats.
    await db.productImage.upsert({
      where: { id: `img-${product.slug}` },
      update: {},
      create: {
        id: `img-${product.slug}`,
        productId: created.id,
        url: `/brand-reference/products/${product.slug}.avif`,
        altHe: product.altHe,
        width: 750,
        height: 1000,
        position: 0,
        isPrimary: true,
      },
    });

    // Single default variant. SKU is generated — the real one is unknown.
    const variant = await db.productVariant.upsert({
      where: { sku: `MKP-${product.slug.toUpperCase()}-STD` },
      update: {},
      create: {
        productId: created.id,
        sku: `MKP-${product.slug.toUpperCase()}-STD`,
        volumeMl: product.volumeMl,
        concentration: product.concentration,
        priceAgorot: product.devPriceAgorot,
        compareAtAgorot: product.devCompareAtAgorot,
        isDefault: true,
        isActive: true,
        position: 0,
      },
    });

    // Development stock.
    const inventory = await db.inventoryItem.upsert({
      where: { variantId: variant.id },
      update: {},
      create: {
        variantId: variant.id,
        quantityOnHand: index === PRODUCTS.length - 1 ? 0 : 12 + index,
        quantityReserved: 0,
        lowStockThreshold: 5,
      },
    });
    const existingMovement = await db.inventoryMovement.findFirst({
      where: { inventoryItemId: inventory.id, reason: InventoryMovementReason.INITIAL_STOCK },
    });
    if (!existingMovement) {
      await db.inventoryMovement.create({
        data: {
          inventoryItemId: inventory.id,
          delta: inventory.quantityOnHand,
          reason: InventoryMovementReason.INITIAL_STOCK,
          note: 'מלאי התחלתי — נתוני פיתוח',
        },
      });
    }

    // Collection membership, from the verified bottle mould.
    const collection = COLLECTIONS.find((c) => c.moulds.includes(product.mould));
    if (collection) {
      const collectionRow = await db.collection.findUniqueOrThrow({
        where: { slug: collection.slug },
      });
      await db.productCollection.upsert({
        where: { productId_collectionId: { productId: created.id, collectionId: collectionRow.id } },
        update: {},
        create: { productId: created.id, collectionId: collectionRow.id, position: index },
      });
    }
  }

  console.log('→ seeding development coupon');
  await db.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      descriptionHe: 'קופון פיתוח — 10% הנחה',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minSubtotalAgorot: 20000,
      maxDiscountAgorot: 10000,
      usageLimit: 1000,
      perUserLimit: 1,
      isActive: true,
    },
  });

  console.log('→ seeding editable content blocks');
  const blocks = [
    {
      key: 'home.hero',
      kind: ContentBlockKind.HERO,
      titleHe: 'ניחוח שנשאר איתך',
      bodyHe: 'בשמי יוקרה, לבונה וקטורת שנוצרו מתוך מסורת, חומרי גלם ואהבה לפרטים.',
      ctaLabelHe: 'לגלות את הקולקציה',
      ctaHref: '/shop',
    },
    {
      key: 'home.brand-story',
      kind: ContentBlockKind.BRAND_STORY,
      titleHe: 'מהמסורת העומאנית אל הניחוח המודרני',
      // Deliberately free of unverifiable historical claims. Editable in admin.
      bodyHe:
        'המסע של Makkah Perfumes החל בשנת 1976 בסולטנות עומאן, מתוך תשוקה ' +
        'ליצירת ניחוחות המחברים בין מסורת הבישום הערבית והעומאנית לבין גישה מודרנית ומדויקת.',
    },
  ];
  for (const [position, block] of blocks.entries()) {
    await db.contentBlock.upsert({
      where: { key: block.key },
      update: {},
      create: { ...block, position, isPublished: true },
    });
  }

  console.log('→ seeding site settings');
  const settings: Record<string, string> = {
    'store.name': 'מכה פרפיומס',
    'store.legalEntity': '',
    'store.phone': '',
    'store.email': '',
    'data.pricingVerified': 'true',
    'data.shippingRatesVerified': 'false',
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // NOT seeded, deliberately:
  //   reviews   — no real reviews exist; fabricating them is forbidden.
  //   branches  — no public branch details are maintained by this website.

  const counts = {
    products: await db.product.count(),
    variants: await db.productVariant.count(),
    families: await db.fragranceFamily.count(),
    collections: await db.collection.count(),
    reviews: await db.review.count(),
    branches: await db.branch.count(),
  };
  console.log('✓ seed complete', counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
