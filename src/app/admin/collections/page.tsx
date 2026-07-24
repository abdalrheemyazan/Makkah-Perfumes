import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'קולקציות' };

export default async function AdminCollectionsPage() {
  await requireCapability('products.write');

  const collections = await db.collection.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader
        titleHe="קולקציות"
        descriptionHe="הקולקציות מקובצות לפי שפת העיצוב של הבקבוק, כפי שאומתה מהתצלומים הרשמיים."
      />
      {collections.length === 0 ? (
        <div className="mt-8">
          <EmptyState titleHe="אין קולקציות" />
        </div>
      ) : (
        <Table headers={['שם', 'כתובת', 'מוצרים', 'סטטוס', '']}>
          {collections.map((collection) => (
            <Row key={collection.id}>
              <Cell labelHe="שם">
                <span className="text-ivory">{collection.nameHe}</span>
              </Cell>
              <Cell labelHe="כתובת">
                <span className="text-xs" dir="ltr">
                  {collection.slug}
                </span>
              </Cell>
              <Cell labelHe="מוצרים">
                <span className="ltr-nums">{collection._count.products}</span>
              </Cell>
              <Cell labelHe="סטטוס">
                <Badge tone={collection.isPublished ? 'success' : 'neutral'}>
                  {collection.isPublished ? 'מפורסמת' : 'מוסתרת'}
                </Badge>
              </Cell>
              <Cell>
                {collection.isPublished && (
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="text-xs text-gold hover:text-cream"
                    target="_blank"
                    rel="noreferrer"
                  >
                    צפייה ↗
                  </Link>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}
