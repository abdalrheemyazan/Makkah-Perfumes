import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  Concentration,
  ContentBlockKind,
  DiscountType,
  InventoryMovementReason,
  ProductStatus,
  RoleName,
} from '../src/generated/prisma/enums';

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
 * WHAT IS DELIBERATELY ABSENT:
 *   - Fragrance notes (never invented — notesVerified stays false, so the
 *     pyramid does not render).
 *   - Reviews (no fabricated testimonials).
 *   - Branches (no invented addresses).
 *   - Any company-history claim presented as fact.
 *
 * See docs/MISSING_BUSINESS_DATA.md.
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
  familySlug: string;
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
    familySlug: 'leather-incense',
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
    familySlug: 'vanilla-sweet',
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
    familySlug: 'oriental',
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
    familySlug: 'leather-incense',
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
    familySlug: 'amber-musk',
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
    familySlug: 'woody',
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
    familySlug: 'floral',
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
    familySlug: 'floral',
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
    familySlug: 'fresh',
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
    familySlug: 'fresh',
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
    familySlug: 'fresh',
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
    familySlug: 'woody',
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
    familySlug: 'vanilla-sweet',
    mould: 'standalone',
    altHe: 'בקבוק הבושם Precious Vanilla — בקבוק מלבני מעוגל בשחור מט עם לוגו כסוף ופקק כסוף',
    isFeatured: false,
    isNewArrival: false,
  },
];

const FAMILIES = [
  { slug: 'oriental', nameHe: 'ניחוחות מזרחיים', accentColor: '#9A542E', position: 1,
    descriptionHe: 'עוד, שרפים וחומרים כבדים — הלב של הבישום הערבי המסורתי.' },
  { slug: 'woody', nameHe: 'ניחוחות עציים', accentColor: '#6B5334', position: 2,
    descriptionHe: 'עצי ארז, סנדל ווטיבר — יובש אצילי ושקט.' },
  { slug: 'floral', nameHe: 'ניחוחות פרחוניים', accentColor: '#8C4A57', position: 3,
    descriptionHe: 'ורד, יסמין ופריחה — נשיות קלאסית בפרשנות מודרנית.' },
  { slug: 'fresh', nameHe: 'ניחוחות רעננים', accentColor: '#4A6B72', position: 4,
    descriptionHe: 'הדרים, אקווטיים ותווים ארומטיים — קלילות יומיומית.' },
  { slug: 'amber-musk', nameHe: 'ענבר ומושק', accentColor: '#B38A52', position: 5,
    descriptionHe: 'חום, עוטף וקטיפתי — החתימה החמה של הבית.' },
  { slug: 'leather-incense', nameHe: 'עור וקטורת', accentColor: '#4A2023', position: 6,
    descriptionHe: 'לבונה, קטורת ועור — עשן אציל ונוכחות עמוקה.' },
  { slug: 'vanilla-sweet', nameHe: 'וניל ומתוקים', accentColor: '#A8763F', position: 7,
    descriptionHe: 'וניל, קרמל ותווים גורמה — מתיקות מרוסנת.' },
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
    CONTENT_MANAGER: 'ניהול תוכן, מגזין ועמודי מידע',
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
  for (const family of FAMILIES) {
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
    const family = await db.fragranceFamily.findUniqueOrThrow({
      where: { slug: product.familySlug },
    });

    const created = await db.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        nameHe: product.nameHe,
        nameEn: product.nameEn,
        // Neutral, factual copy. No invented history, notes, or performance claims.
        descriptionHe:
          'תיאור רשמי טרם התקבל מהמותג. הפרטים המוצגים כאן מבוססים על תצלום המוצר בלבד.',
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date(),
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        categoryId: category.id,
        fragranceFamilyId: family.id,
        notesVerified: false,
        pricingVerified: false,
        isDevelopmentData: true,
        seoTitleHe: `${product.nameHe} — ${product.nameEn} | מכה פרפיומס`,
      },
    });

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
        'לבונה, עוד וענבר הם חומרי הגלם שעליהם נבנתה מסורת הבישום של דרום ערב. ' +
        'מכה פרפיומס נושאת על תוויותיה את הכיתוב SINCE 1976. ' +
        'סיפור המותג המלא יתעדכן כאן לאחר אישור המותג.',
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
    'data.pricingVerified': 'false',
    'data.shippingRatesVerified': 'false',
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // NOT seeded, deliberately:
  //   reviews   — no real reviews exist; fabricating them is forbidden.
  //   branches  — no verified addresses; the page shows an empty state.
  //   notes     — no verified fragrance pyramids.

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
