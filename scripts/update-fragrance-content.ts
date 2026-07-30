import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { NoteTier } from '../src/generated/prisma/enums';
import { FRAGRANCE_CONTENT } from '../src/lib/fragrance-content';

const CONFIRM_PHRASE = 'UPDATE VERIFIED FRAGRANCE CONTENT';
const args = new Set(process.argv.slice(2));
const confirm = args.has('--confirm');
const explicitDryRun = args.has('--dry-run');

if (confirm && explicitDryRun) {
  throw new Error('Choose either --dry-run or --confirm, not both.');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

if (confirm) {
  if (process.env.ALLOW_PRODUCTION_PRODUCT_CONTENT_UPDATE !== 'true') {
    throw new Error('Confirmation blocked: ALLOW_PRODUCTION_PRODUCT_CONTENT_UPDATE must equal true.');
  }
  if (process.env.PRODUCT_CONTENT_CONFIRM_PHRASE !== CONFIRM_PHRASE) {
    throw new Error('Confirmation blocked: PRODUCT_CONTENT_CONFIRM_PHRASE is incorrect.');
  }
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function descriptionState(value: string | null): 'empty' | 'placeholder' | 'populated' {
  if (!value?.trim()) return 'empty';
  if (/טרם|תצלום המוצר בלבד|placeholder/i.test(value)) return 'placeholder';
  return 'populated';
}

async function main() {
  const mode = confirm ? 'CONFIRM' : 'DRY RUN';
  console.log(`[fragrance-content] mode: ${mode}`);
  console.log('[fragrance-content] database URL is configured (value hidden)');

  const slugs = FRAGRANCE_CONTENT.map((item) => item.slug);
  const existing = await db.product.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      descriptionHe: true,
      notesVerified: true,
      _count: { select: { notes: true } },
    },
  });
  const existingBySlug = new Map(existing.map((product) => [product.slug, product]));

  for (const content of FRAGRANCE_CONTENT) {
    const current = existingBySlug.get(content.slug);
    console.log(`\n${current ? 'MATCH' : 'MISSING'} ${content.slug}`);
    console.log(`  current description: ${descriptionState(current?.descriptionHe ?? null)}`);
    console.log(`  current notes: ${current?._count.notes ?? 0}; verified: ${current?.notesVerified ?? false}`);
    console.log(`  intended description: ${content.descriptionHe}`);
    console.log(`  intended note count: ${content.notes.length}; structure: ${content.noteStructure}`);
  }

  const missing = slugs.filter((slug) => !existingBySlug.has(slug));
  if (missing.length > 0) {
    throw new Error(`Aborted: ${missing.length} product slug(s) were not matched: ${missing.join(', ')}`);
  }

  if (!confirm) {
    console.log(`\n[fragrance-content] dry run complete: ${existing.length}/${slugs.length} products matched; no writes performed.`);
    return;
  }

  await db.$transaction(async (tx) => {
    for (const content of FRAGRANCE_CONTENT) {
      const current = existingBySlug.get(content.slug)!;
      const family = await tx.fragranceFamily.upsert({
        where: { slug: content.family.slug },
        update: {
          nameHe: content.family.nameHe,
          accentColor: content.family.accentColor,
          position: content.family.position,
        },
        create: content.family,
      });

      await tx.product.update({
        where: { id: current.id },
        data: {
          ...(content.publicTitleHe ? { nameHe: content.publicTitleHe } : {}),
          descriptionHe: content.descriptionHe,
          fragranceFamilyId: family.id,
          notesVerified: true,
          seoDescriptionHe: content.descriptionHe,
        },
      });

      await tx.productFragranceNote.deleteMany({ where: { productId: current.id } });
      const tierPositions = new Map<string, number>();

      for (const sourceNote of content.notes) {
        const noteRow = await tx.fragranceNote.upsert({
          where: { slug: sourceNote.slug },
          update: { nameHe: sourceNote.nameHe, nameEn: sourceNote.nameEn },
          create: { slug: sourceNote.slug, nameHe: sourceNote.nameHe, nameEn: sourceNote.nameEn },
        });

        // The existing schema has only TOP/HEART/BASE. KEY is a verified flat
        // presentation in the source map; its relationships use TOP as a storage
        // adapter and are never presented publicly as a top-note tier.
        const storedTier = sourceNote.tier === 'KEY' ? NoteTier.TOP : NoteTier[sourceNote.tier];
        const position = tierPositions.get(sourceNote.tier) ?? 0;
        tierPositions.set(sourceNote.tier, position + 1);

        await tx.productFragranceNote.create({
          data: {
            productId: current.id,
            noteId: noteRow.id,
            tier: storedTier,
            position,
          },
        });
      }
    }
  });

  console.log(`\n[fragrance-content] confirmed: ${slugs.length} products updated by exact slug.`);
  console.log('[fragrance-content] prices, SKUs, images, inventory, orders and product IDs were not changed.');
}

main()
  .catch((error) => {
    console.error('[fragrance-content] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
