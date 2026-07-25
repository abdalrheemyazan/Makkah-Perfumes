'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { CATALOG_TAGS, productTag } from '@/lib/catalog';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireCapability } from '@/lib/auth';
import { logAudit } from '@/lib/admin/audit';
import { shekelsToAgorot } from '@/lib/commerce/money';
import { fieldErrors } from '@/lib/validation';
import type { AdminActionState } from '@/lib/action-state';

/**
 * Product mutations.
 *
 * Every export re-checks the caller's capability. The admin layout already
 * gates the UI, but a Server Action is a public HTTP endpoint — it must never
 * rely on the page that rendered the form.
 */

/** Latin/Hebrew-safe slug. Falls back to a timestamp if nothing survives. */
function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/['"׳״]/g, '')
    .replace(/[^a-z0-9֐-׿]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `product-${Date.now()}`;
}

const productSchema = z.object({
  nameHe: z.string().trim().min(2, 'יש להזין שם בעברית').max(120),
  nameEn: z.string().trim().min(2, 'יש להזין שם רשמי באנגלית').max(120),
  slug: z.string().trim().max(140).optional().or(z.literal('')),
  descriptionHe: z.string().trim().max(4000).optional().or(z.literal('')),
  storyHe: z.string().trim().max(4000).optional().or(z.literal('')),
  usageHe: z.string().trim().max(2000).optional().or(z.literal('')),
  ingredientsHe: z.string().trim().max(4000).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  categoryId: z.string().trim().optional().or(z.literal('')),
  fragranceFamilyId: z.string().trim().optional().or(z.literal('')),
  seoTitleHe: z.string().trim().max(160).optional().or(z.literal('')),
  seoDescriptionHe: z.string().trim().max(320).optional().or(z.literal('')),
  isFeatured: z.coerce.boolean().optional().default(false),
  isNewArrival: z.coerce.boolean().optional().default(false),
  notesVerified: z.coerce.boolean().optional().default(false),
  pricingVerified: z.coerce.boolean().optional().default(false),

  // Default variant fields
  sku: z.string().trim().min(2, 'יש להזין מק״ט').max(60),
  priceShekels: z.coerce.number().min(0, 'המחיר אינו תקין').max(1_000_000),
  compareAtShekels: z.coerce.number().min(0).max(1_000_000).optional(),
  volumeMl: z.coerce.number().int().min(1).max(10_000).optional(),
  concentration: z.enum([
    'PARFUM',
    'EAU_DE_PARFUM',
    'EAU_DE_TOILETTE',
    'EAU_DE_COLOGNE',
    'ATTAR_OIL',
    'INCENSE',
    'UNSPECIFIED',
  ]),
  quantityOnHand: z.coerce.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(10_000),
});

function readForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return {
    ...raw,
    isFeatured: formData.get('isFeatured') === 'on',
    isNewArrival: formData.get('isNewArrival') === 'on',
    notesVerified: formData.get('notesVerified') === 'on',
    pricingVerified: formData.get('pricingVerified') === 'on',
    compareAtShekels: raw.compareAtShekels === '' ? undefined : raw.compareAtShekels,
    volumeMl: raw.volumeMl === '' ? undefined : raw.volumeMl,
  };
}

export async function createProduct(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('products.write');

  const parsed = productSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      messageHe: 'יש לתקן את השדות המסומנים.',
      errors: fieldErrors(parsed.error),
    };
  }
  const data = parsed.data;
  const slug = slugify(data.slug || data.nameEn);

  const clash = await db.product.findUnique({ where: { slug } });
  if (clash) {
    return {
      status: 'error',
      messageHe: 'קיים כבר מוצר עם כתובת זהה.',
      errors: { slug: 'הכתובת כבר בשימוש' },
    };
  }
  const skuClash = await db.productVariant.findUnique({ where: { sku: data.sku } });
  if (skuClash) {
    return { status: 'error', messageHe: 'המק״ט כבר קיים.', errors: { sku: 'המק״ט כבר קיים' } };
  }

  let productId = '';
  try {
    // One transaction: a product without its variant and inventory row would be
    // unbuyable and would break the catalogue projection.
    productId = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug,
          nameHe: data.nameHe,
          nameEn: data.nameEn,
          descriptionHe: data.descriptionHe || null,
          storyHe: data.storyHe || null,
          usageHe: data.usageHe || null,
          ingredientsHe: data.ingredientsHe || null,
          status: data.status,
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
          categoryId: data.categoryId || null,
          fragranceFamilyId: data.fragranceFamilyId || null,
          seoTitleHe: data.seoTitleHe || null,
          seoDescriptionHe: data.seoDescriptionHe || null,
          isFeatured: data.isFeatured,
          isNewArrival: data.isNewArrival,
          notesVerified: data.notesVerified,
          pricingVerified: data.pricingVerified,
          isDevelopmentData: !data.pricingVerified,
        },
      });

      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: data.sku,
          priceAgorot: shekelsToAgorot(data.priceShekels),
          compareAtAgorot:
            data.compareAtShekels != null ? shekelsToAgorot(data.compareAtShekels) : null,
          volumeMl: data.volumeMl ?? null,
          concentration: data.concentration,
          isDefault: true,
          isActive: true,
        },
      });

      const inventory = await tx.inventoryItem.create({
        data: {
          variantId: variant.id,
          quantityOnHand: data.quantityOnHand,
          lowStockThreshold: data.lowStockThreshold,
        },
      });

      if (data.quantityOnHand > 0) {
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: inventory.id,
            delta: data.quantityOnHand,
            reason: 'INITIAL_STOCK',
            createdByUserId: user.id,
            note: 'מלאי התחלתי בעת יצירת המוצר',
          },
        });
      }

      return product.id;
    });
  } catch (error) {
    console.error('[admin] createProduct failed', error);
    return { status: 'error', messageHe: 'שמירת המוצר נכשלה.', errors: {} };
  }

  await logAudit({
    userId: user.id,
    action: 'product.create',
    entityType: 'Product',
    entityId: productId,
    after: { slug, nameHe: data.nameHe, nameEn: data.nameEn, status: data.status },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  updateTag(CATALOG_TAGS.products);
  updateTag(productTag(slug));
  redirect(`/admin/products/${productId}?created=1`);
}

export async function updateProduct(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('products.write');
  const productId = String(formData.get('productId') ?? '');
  if (!productId) return { status: 'error', messageHe: 'בקשה לא תקינה.', errors: {} };

  const parsed = productSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      messageHe: 'יש לתקן את השדות המסומנים.',
      errors: fieldErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const existing = await db.product.findUnique({
    where: { id: productId },
    include: { variants: { where: { isDefault: true }, take: 1 } },
  });
  if (!existing) return { status: 'error', messageHe: 'המוצר לא נמצא.', errors: {} };

  const slug = slugify(data.slug || existing.slug);
  if (slug !== existing.slug) {
    const clash = await db.product.findUnique({ where: { slug } });
    if (clash) {
      return {
        status: 'error',
        messageHe: 'קיים כבר מוצר עם כתובת זהה.',
        errors: { slug: 'הכתובת כבר בשימוש' },
      };
    }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          slug,
          nameHe: data.nameHe,
          nameEn: data.nameEn,
          descriptionHe: data.descriptionHe || null,
          storyHe: data.storyHe || null,
          usageHe: data.usageHe || null,
          ingredientsHe: data.ingredientsHe || null,
          status: data.status,
          publishedAt:
            data.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
          categoryId: data.categoryId || null,
          fragranceFamilyId: data.fragranceFamilyId || null,
          seoTitleHe: data.seoTitleHe || null,
          seoDescriptionHe: data.seoDescriptionHe || null,
          isFeatured: data.isFeatured,
          isNewArrival: data.isNewArrival,
          notesVerified: data.notesVerified,
          pricingVerified: data.pricingVerified,
          isDevelopmentData: !data.pricingVerified,
        },
      });

      const variant = existing.variants[0];
      if (variant) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            sku: data.sku,
            priceAgorot: shekelsToAgorot(data.priceShekels),
            compareAtAgorot:
              data.compareAtShekels != null ? shekelsToAgorot(data.compareAtShekels) : null,
            volumeMl: data.volumeMl ?? null,
            concentration: data.concentration,
          },
        });
        await tx.inventoryItem.updateMany({
          where: { variantId: variant.id },
          data: { lowStockThreshold: data.lowStockThreshold },
        });
      }
    });
  } catch (error) {
    console.error('[admin] updateProduct failed', error);
    return { status: 'error', messageHe: 'עדכון המוצר נכשל.', errors: {} };
  }

  await logAudit({
    userId: user.id,
    action: 'product.update',
    entityType: 'Product',
    entityId: productId,
    before: {
      slug: existing.slug,
      status: existing.status,
      pricingVerified: existing.pricingVerified,
      priceAgorot: existing.variants[0]?.priceAgorot,
    },
    after: {
      slug,
      status: data.status,
      pricingVerified: data.pricingVerified,
      priceAgorot: shekelsToAgorot(data.priceShekels),
    },
  });

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/shop/${slug}`);
  revalidatePath('/shop');
  updateTag(CATALOG_TAGS.products);
  updateTag(productTag(slug));
  if (slug !== existing.slug) updateTag(productTag(existing.slug));

  return { status: 'success', messageHe: 'המוצר נשמר.', errors: {} };
}

/** Archive / restore / publish — a status change with an audit trail. */
export async function setProductStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('products.write');
  const productId = String(formData.get('productId') ?? '');
  const status = String(formData.get('status') ?? '');

  if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    return { status: 'error', messageHe: 'סטטוס לא תקין.', errors: {} };
  }

  const existing = await db.product.findUnique({ where: { id: productId } });
  if (!existing) return { status: 'error', messageHe: 'המוצר לא נמצא.', errors: {} };

  await db.product.update({
    where: { id: productId },
    data: {
      status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      publishedAt:
        status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
    },
  });

  await logAudit({
    userId: user.id,
    action: 'product.status',
    entityType: 'Product',
    entityId: productId,
    before: { status: existing.status },
    after: { status },
  });

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/shop');
  updateTag(CATALOG_TAGS.products);
  updateTag(productTag(existing.slug));

  return { status: 'success', messageHe: 'הסטטוס עודכן.', errors: {} };
}

/** Duplicates a product as a draft, including its default variant. */
export async function duplicateProduct(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireCapability('products.write');
  const productId = String(formData.get('productId') ?? '');

  const source = await db.product.findUnique({
    where: { id: productId },
    include: {
      variants: { where: { isDefault: true }, take: 1 },
      images: true,
    },
  });
  if (!source) return { status: 'error', messageHe: 'המוצר לא נמצא.', errors: {} };

  const stamp = Date.now().toString(36);
  let newId = '';

  try {
    newId = await db.$transaction(async (tx) => {
      const copy = await tx.product.create({
        data: {
          slug: `${source.slug}-copy-${stamp}`,
          nameHe: `${source.nameHe} (עותק)`,
          nameEn: `${source.nameEn} (copy)`,
          descriptionHe: source.descriptionHe,
          storyHe: source.storyHe,
          usageHe: source.usageHe,
          ingredientsHe: source.ingredientsHe,
          // A duplicate is always a draft — never silently republished.
          status: 'DRAFT',
          categoryId: source.categoryId,
          fragranceFamilyId: source.fragranceFamilyId,
          notesVerified: source.notesVerified,
          pricingVerified: false,
          isDevelopmentData: true,
          seoTitleHe: source.seoTitleHe,
          seoDescriptionHe: source.seoDescriptionHe,
        },
      });

      for (const image of source.images) {
        await tx.productImage.create({
          data: {
            productId: copy.id,
            url: image.url,
            altHe: image.altHe,
            width: image.width,
            height: image.height,
            position: image.position,
            isPrimary: image.isPrimary,
          },
        });
      }

      const sourceVariant = source.variants[0];
      if (sourceVariant) {
        const variant = await tx.productVariant.create({
          data: {
            productId: copy.id,
            sku: `${sourceVariant.sku}-COPY-${stamp.toUpperCase()}`,
            priceAgorot: sourceVariant.priceAgorot,
            compareAtAgorot: sourceVariant.compareAtAgorot,
            volumeMl: sourceVariant.volumeMl,
            concentration: sourceVariant.concentration,
            isDefault: true,
            isActive: true,
          },
        });
        // A copy starts with zero stock; inventory is never duplicated.
        await tx.inventoryItem.create({
          data: { variantId: variant.id, quantityOnHand: 0, lowStockThreshold: 5 },
        });
      }

      return copy.id;
    });
  } catch (error) {
    console.error('[admin] duplicateProduct failed', error);
    return { status: 'error', messageHe: 'שכפול המוצר נכשל.', errors: {} };
  }

  await logAudit({
    userId: user.id,
    action: 'product.duplicate',
    entityType: 'Product',
    entityId: newId,
    after: { sourceId: productId },
  });

  revalidatePath('/admin/products');
  updateTag(CATALOG_TAGS.products);
  redirect(`/admin/products/${newId}?duplicated=1`);
}
