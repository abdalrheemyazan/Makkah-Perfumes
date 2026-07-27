import type { Metadata } from 'next';
import Link from 'next/link';
import { RestockUnsubscribeForm } from './unsubscribe-form';

export const metadata: Metadata = {
  title: 'ביטול עדכון חזרה למלאי',
  robots: { index: false, follow: false },
};

export default async function RestockUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="container-editorial pt-32 pb-24">
      <h1 className="font-serif text-3xl text-ivory sm:text-4xl">ביטול עדכון חזרה למלאי</h1>

      {token ? (
        <>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-cream/80">
            לחיצה על הכפתור תבטל את קבלת ההתראה על חזרת המוצר למלאי. תוכלו להירשם שוב בכל עת מעמוד המוצר.
          </p>
          <RestockUnsubscribeForm token={token} />
        </>
      ) : (
        <p className="mt-4 text-sm text-danger">הקישור אינו תקין או שפג תוקפו.</p>
      )}

      <p className="mt-10 text-sm">
        <Link href="/" className="text-gold underline underline-offset-2 hover:text-cream">
          חזרה לדף הבית
        </Link>
      </p>
    </div>
  );
}
