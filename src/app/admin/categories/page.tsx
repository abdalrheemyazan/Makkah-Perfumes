import type { Metadata } from 'next';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'קטגוריות' };

export default async function AdminCategoriesPage() {
  await requireCapability('products.write');

  const categories = await db.category.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader
        titleHe="קטגוריות"
        descriptionHe="סיווג ראשי של המוצרים בקטלוג."
      />
      {categories.length === 0 ? (
        <div className="mt-8">
          <EmptyState titleHe="אין קטגוריות" descriptionHe="הקטגוריות נוצרות בזריעת בסיס הנתונים." />
        </div>
      ) : (
        <Table headers={['שם', 'כתובת', 'תיאור', 'מוצרים']}>
          {categories.map((category) => (
            <Row key={category.id}>
              <Cell labelHe="שם">
                <span className="text-ivory">{category.nameHe}</span>
              </Cell>
              <Cell labelHe="כתובת">
                <span className="text-xs" dir="ltr">
                  {category.slug}
                </span>
              </Cell>
              <Cell labelHe="תיאור">
                <span className="text-xs text-muted">{category.descriptionHe ?? '—'}</span>
              </Cell>
              <Cell labelHe="מוצרים">
                <span className="ltr-nums">{category._count.products}</span>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}
