import type { Metadata } from 'next';
import Image from 'next/image';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, PageHeader, StatCard } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'מדיה' };

const GENERATED_DIRS = [
  { dir: 'cinematic', labelHe: 'סצנות קולנועיות' },
  { dir: 'posters', labelHe: 'פוסטרים ותנועה מופחתת' },
  { dir: 'mobile', labelHe: 'גרסאות מובייל' },
  { dir: 'social', labelHe: 'רשתות חברתיות' },
  { dir: 'products', labelHe: 'סצנות מוצר' },
  { dir: 'textures', labelHe: 'טקסטורות' },
];

type MediaFile = { name: string; url: string; sizeKb: number };

async function listGenerated(dir: string): Promise<MediaFile[]> {
  const base = join(process.cwd(), 'public', 'generated', dir);
  try {
    const names = await readdir(base);
    const files = await Promise.all(
      names
        .filter((name) => !name.startsWith('.'))
        .map(async (name) => {
          const info = await stat(join(base, name));
          return {
            name,
            url: `/generated/${dir}/${name}`,
            sizeKb: Math.round(info.size / 1024),
          };
        }),
    );
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // Directory may not exist yet — that is not an error worth surfacing.
    return [];
  }
}

export default async function AdminMediaPage() {
  await requireCapability('content.write');

  const [groups, productImages] = await Promise.all([
    Promise.all(
      GENERATED_DIRS.map(async (group) => ({
        ...group,
        files: await listGenerated(group.dir),
      })),
    ),
    db.productImage.count(),
  ]);

  const totalGenerated = groups.reduce((sum, group) => sum + group.files.length, 0);
  const totalKb = groups.reduce(
    (sum, group) => sum + group.files.reduce((s, file) => s + file.sizeKb, 0),
    0,
  );

  return (
    <div>
      <PageHeader
        titleHe="מדיה"
        descriptionHe="נכסים שנוצרו ותצלומי המוצר הרשמיים. העלאת קבצים מהדפדפן טרם מומשה — ראו הערה למטה."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard labelHe="נכסים שנוצרו" value={String(totalGenerated)} />
        <StatCard labelHe="תצלומי מוצר" value={String(productImages)} />
        <StatCard labelHe="נפח כולל" value={`${totalKb} KB`} />
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {groups.map((group) => (
          <Card key={group.dir} titleHe={group.labelHe} descriptionHe={`/generated/${group.dir}`}>
            {group.files.length === 0 ? (
              <p className="text-sm text-muted">אין קבצים בתיקייה זו.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.files.map((file) => (
                  <li key={file.url} className="overflow-hidden rounded-sm border border-gold/15">
                    <div className="relative aspect-video bg-ink">
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        sizes="240px"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs text-cream" dir="ltr" title={file.name}>
                        {file.name}
                      </p>
                      <p className="ltr-nums mt-0.5 text-[0.7rem] text-faint">{file.sizeKb} KB</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card titleHe="העלאת קבצים">
          <p className="text-sm leading-relaxed text-muted">
            העלאת מדיה מהדפדפן טרם מומשה. נכסים נוספים מיוצרים כרגע דרך
            <span dir="ltr"> scripts/build-generated-assets.mjs</span> ונשמרים תחת
            <span dir="ltr"> public/generated</span>. מימוש העלאה יחייב אימות סוג קובץ,
            הגבלת גודל וסינון תוכן — ראו <span dir="ltr">docs/DEPLOYMENT.md</span>.
          </p>
        </Card>
      </div>
    </div>
  );
}
