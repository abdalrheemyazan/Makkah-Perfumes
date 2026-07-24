import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cardSelect, toCard, type ProductCard as ProductCardData } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import {
  explanationHe,
  isComplete,
  parseAnswers,
  QUESTIONS,
  scoreFamilies,
} from '@/lib/fragrance-finder';

export const metadata: Metadata = {
  title: 'התאמת ניחוח',
  description: 'חמש שאלות קצרות שיובילו אתכם לבושם המתאים מתוך הקטלוג.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The questionnaire is a plain GET form: it works without JavaScript, every
 * result is a shareable URL, and the back button behaves.
 */
export default async function FragranceFinderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const answers = parseAnswers(params);
  const complete = isComplete(answers);

  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="max-w-2xl">
        <p className="text-sm tracking-[0.2em] text-gold uppercase">התאמה אישית</p>
        <h1 className="mt-3 font-serif text-4xl text-ivory sm:text-5xl">התאמת ניחוח</h1>
        <p className="mt-4 text-base leading-relaxed text-cream/85">
          ענו על חמש שאלות ונציע בשמים מתוך הקטלוג, עם הסבר למה כל אחד מהם מתאים.
          ההמלצות נקבעות לפי כללים קבועים — אותן תשובות תמיד יובילו לאותה תוצאה.
        </p>
      </div>

      <form method="get" className="mt-12 flex flex-col gap-10">
        {QUESTIONS.map((question, index) => (
          <fieldset key={question.id} className="border-t border-gold/15 pt-8 first:border-0 first:pt-0">
            <legend className="flex items-center gap-3 font-serif text-xl text-ivory">
              <span className="ltr-nums grid h-7 w-7 place-items-center rounded-full border border-gold/45 text-xs text-gold">
                {index + 1}
              </span>
              {question.promptHe}
            </legend>

            <div className="mt-5 flex flex-wrap gap-3">
              {question.answers.map((answer) => {
                const selected = answers[question.id] === answer.value;
                return (
                  <label
                    key={answer.value}
                    // focus-within keeps the keyboard ring visible even though
                    // the radio itself is visually hidden.
                    className={`cursor-pointer rounded-sm border px-4 py-2.5 text-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-gold ${
                      selected
                        ? 'border-gold bg-gold/10 text-ivory'
                        : 'border-gold/25 text-cream hover:border-gold/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={answer.value}
                      defaultChecked={selected}
                      className="sr-only"
                    />
                    {answer.labelHe}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="flex flex-wrap gap-3 border-t border-gold/15 pt-8">
          <button
            type="submit"
            className="h-12 rounded-sm bg-gold px-7 text-sm font-medium text-ink transition-colors hover:bg-cream"
          >
            להצגת ההמלצות
          </button>
          <Link
            href="/fragrance-finder"
            className="inline-flex h-12 items-center rounded-sm border border-gold/35 px-5 text-sm text-cream hover:border-gold"
          >
            איפוס
          </Link>
        </div>
      </form>

      {complete ? (
        <Recommendations answers={answers} />
      ) : (
        Object.keys(answers).length > 0 && (
          <p className="mt-10 text-sm text-muted">
            ענו על כל חמש השאלות כדי לקבל המלצות.
          </p>
        )
      )}
    </div>
  );
}

async function Recommendations({
  answers,
}: {
  answers: ReturnType<typeof parseAnswers>;
}) {
  const ranked = scoreFamilies(answers);
  const topFamilies = ranked.slice(0, 3);

  if (topFamilies.length === 0) {
    return (
      <p className="mt-12 text-sm text-muted">
        לא הצלחנו לגזור המלצה מהתשובות. נסו לשנות בחירה.
      </p>
    );
  }

  const families = await db.fragranceFamily.findMany({
    where: { slug: { in: topFamilies.map((entry) => entry.family) } },
    select: { slug: true, nameHe: true },
  });
  const familyNames = new Map(families.map((family) => [family.slug, family.nameHe]));

  const rows = await db.product.findMany({
    where: {
      status: 'PUBLISHED',
      fragranceFamily: { slug: { in: topFamilies.map((entry) => entry.family) } },
    },
    select: { ...cardSelect, fragranceFamily: { select: { nameHe: true, slug: true } } },
  });

  const cards = rows
    .map(toCard)
    .filter((card): card is ProductCardData => card !== null)
    // Order products by how strongly their family scored.
    .sort((a, b) => {
      const rank = (slug: string | null) =>
        topFamilies.findIndex((entry) => entry.family === slug);
      return rank(a.familySlug) - rank(b.familySlug);
    })
    .slice(0, 6);

  return (
    <section aria-labelledby="results-heading" className="mt-16 border-t border-gold/15 pt-12">
      <h2 id="results-heading" className="font-serif text-3xl text-ivory">
        ההמלצות שלנו
      </h2>

      <ul className="mt-6 flex flex-col gap-3">
        {topFamilies.map((entry) => {
          const nameHe = familyNames.get(entry.family) ?? entry.family;
          return (
            <li key={entry.family} className="rounded-sm border border-gold/15 bg-charcoal p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg text-ivory">{nameHe}</h3>
                <span className="ltr-nums text-xs text-gold">
                  התאמה: {entry.score} נק׳
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{explanationHe(entry, nameHe)}</p>
            </li>
          );
        })}
      </ul>

      {cards.length > 0 && (
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3">
          {cards.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <p className="mt-10 max-w-2xl text-xs leading-relaxed text-faint">
        ההתאמה מבוססת כרגע על משפחת הניחוח של כל מוצר. תווי הפתיחה, הלב והבסיס
        טרם התקבלו מהמותג, ולכן אינם משתתפים בחישוב.
      </p>
    </section>
  );
}
