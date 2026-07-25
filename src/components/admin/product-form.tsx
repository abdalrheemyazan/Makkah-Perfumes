'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createProduct, updateProduct } from '@/app/actions/admin/products';
import { ADMIN_ACTION_INITIAL } from '@/lib/action-state';
import { CONCENTRATION_LABELS } from '@/lib/commerce/labels';
import { PRODUCT_STATUS_LABELS } from '@/lib/admin/labels';
import {
  CheckboxField,
  FieldGrid,
  FormAlert,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
} from './form';

export type ProductFormValues = {
  id?: string;
  slug: string;
  nameHe: string;
  nameEn: string;
  descriptionHe: string;
  storyHe: string;
  usageHe: string;
  ingredientsHe: string;
  status: string;
  categoryId: string;
  fragranceFamilyId: string;
  seoTitleHe: string;
  seoDescriptionHe: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  notesVerified: boolean;
  pricingVerified: boolean;
  sku: string;
  priceShekels: string;
  compareAtShekels: string;
  volumeMl: string;
  concentration: string;
  quantityOnHand: string;
  lowStockThreshold: string;
};

export function ProductForm({
  mode,
  values,
  categories,
  families,
  stockLocked,
}: {
  mode: 'create' | 'edit';
  values: ProductFormValues;
  categories: { id: string; nameHe: string }[];
  families: { id: string; nameHe: string }[];
  /** In edit mode stock is managed from the inventory screen, not here. */
  stockLocked?: boolean;
}) {
  const action = mode === 'create' ? createProduct : updateProduct;
  const [state, formAction] = useActionState(action, ADMIN_ACTION_INITIAL);

  const concentrationOptions = Object.entries(CONCENTRATION_LABELS).map(([value, labelHe]) => ({
    value,
    labelHe: labelHe || 'לא צוין',
  }));

  return (
    <form action={formAction} noValidate className="mt-8 flex max-w-4xl flex-col gap-8">
      {values.id && <input type="hidden" name="productId" value={values.id} />}

      <FormAlert status={state.status} messageHe={state.messageHe} />

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-lg text-ivory">זהות המוצר</h2>
        <FieldGrid>
          <TextField
            name="nameHe"
            labelHe="שם בעברית"
            defaultValue={values.nameHe}
            error={state.errors.nameHe}
            required
          />
          <TextField
            name="nameEn"
            labelHe="שם רשמי באנגלית"
            defaultValue={values.nameEn}
            error={state.errors.nameEn}
            dir="ltr"
            required
            hintHe="כפי שמודפס על הבקבוק. אין לשנות."
          />
        </FieldGrid>
        <TextField
          name="slug"
          labelHe="כתובת (slug)"
          defaultValue={values.slug}
          error={state.errors.slug}
          dir="ltr"
          hintHe="ריק = ייווצר אוטומטית מהשם באנגלית"
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-gold/15 pt-8">
        <h2 className="font-serif text-lg text-ivory">תיאור ותוכן</h2>
        <TextArea
          name="descriptionHe"
          labelHe="תיאור"
          defaultValue={values.descriptionHe}
          error={state.errors.descriptionHe}
        />
        <TextArea name="storyHe" labelHe="סיפור הניחוח" defaultValue={values.storyHe} rows={3} />
        <FieldGrid>
          <TextArea name="usageHe" labelHe="הוראות שימוש" defaultValue={values.usageHe} rows={3} />
          <TextArea
            name="ingredientsHe"
            labelHe="רכיבים"
            defaultValue={values.ingredientsHe}
            rows={3}
          />
        </FieldGrid>
      </section>

      <section className="flex flex-col gap-4 border-t border-gold/15 pt-8">
        <h2 className="font-serif text-lg text-ivory">סיווג</h2>
        <FieldGrid>
          <SelectField
            name="status"
            labelHe="סטטוס"
            defaultValue={values.status}
            options={Object.entries(PRODUCT_STATUS_LABELS).map(([value, labelHe]) => ({
              value,
              labelHe,
            }))}
          />
          <SelectField
            name="categoryId"
            labelHe="קטגוריה"
            defaultValue={values.categoryId}
            options={[
              { value: '', labelHe: '— ללא —' },
              ...categories.map((c) => ({ value: c.id, labelHe: c.nameHe })),
            ]}
          />
          <SelectField
            name="fragranceFamilyId"
            labelHe="משפחת ניחוח"
            defaultValue={values.fragranceFamilyId}
            options={[
              { value: '', labelHe: '— ללא —' },
              ...families.map((f) => ({ value: f.id, labelHe: f.nameHe })),
            ]}
          />
        </FieldGrid>
        <div className="flex flex-wrap gap-6">
          <CheckboxField name="isFeatured" labelHe="מוצר מומלץ" defaultChecked={values.isFeatured} />
          <CheckboxField name="isNewArrival" labelHe="חדש" defaultChecked={values.isNewArrival} />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-gold/15 pt-8">
        <h2 className="font-serif text-lg text-ivory">מחיר ומלאי</h2>
        <FieldGrid columns={3}>
          <TextField
            name="sku"
            labelHe="מק״ט"
            defaultValue={values.sku}
            error={state.errors.sku}
            dir="ltr"
            required
          />
          <TextField
            name="priceShekels"
            labelHe="מחיר (₪)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.priceShekels}
            error={state.errors.priceShekels}
            dir="ltr"
            required
          />
          <TextField
            name="compareAtShekels"
            labelHe="מחיר לפני הנחה (₪)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.compareAtShekels}
            dir="ltr"
            hintHe="ריק = אין מבצע"
          />
          <TextField
            name="volumeMl"
            labelHe="נפח (מ״ל)"
            type="number"
            min="1"
            defaultValue={values.volumeMl}
            dir="ltr"
            hintHe="ריק = לא צוין על התווית"
          />
          <SelectField
            name="concentration"
            labelHe="ריכוז"
            defaultValue={values.concentration}
            options={concentrationOptions}
          />
          <TextField
            name="lowStockThreshold"
            labelHe="סף מלאי נמוך"
            type="number"
            min="0"
            defaultValue={values.lowStockThreshold}
            dir="ltr"
          />
          <TextField
            name="quantityOnHand"
            labelHe="כמות במלאי"
            type="number"
            min="0"
            defaultValue={values.quantityOnHand}
            dir="ltr"
            readOnly={stockLocked}
            hintHe={
              stockLocked ? 'שינוי מלאי מתבצע במסך המלאי, עם תיעוד סיבה' : undefined
            }
          />
        </FieldGrid>
      </section>

      <section className="flex flex-col gap-4 border-t border-gold/15 pt-8">
        <h2 className="font-serif text-lg text-ivory">אימות נתונים</h2>
        <p className="text-xs leading-relaxed text-muted">
          סמנו רק לאחר אישור מול המותג. מחיר לא מאומת מוחרג מנתוני ה־SEO.
          תווים שאינם מאומתים אינם מוצגים כלל.
        </p>
        <div className="flex flex-wrap gap-6">
          <CheckboxField
            name="pricingVerified"
            labelHe="המחיר אומת מול המותג"
            defaultChecked={values.pricingVerified}
          />
          <CheckboxField
            name="notesVerified"
            labelHe="תווי הניחוח אומתו"
            defaultChecked={values.notesVerified}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-gold/15 pt-8">
        <h2 className="font-serif text-lg text-ivory">SEO</h2>
        <TextField name="seoTitleHe" labelHe="כותרת SEO" defaultValue={values.seoTitleHe} />
        <TextArea
          name="seoDescriptionHe"
          labelHe="תיאור SEO"
          defaultValue={values.seoDescriptionHe}
          rows={2}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-gold/15 pt-8">
        <SubmitButton labelHe={mode === 'create' ? 'יצירת מוצר' : 'שמירת שינויים'} />
        <Link href="/admin/products" className="text-sm text-muted hover:text-ivory">
          ביטול
        </Link>
      </div>
    </form>
  );
}
