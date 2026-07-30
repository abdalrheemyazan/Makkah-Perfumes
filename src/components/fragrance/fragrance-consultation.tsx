'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import type { ProductCard as ProductCardData } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import { QUESTIONS, scoreSelections, type FinderSelections } from '@/lib/fragrance-finder';
import { usePrefersReducedMotion, useA11yMotionStopped } from '@/lib/hooks';

/**
 * Guided fragrance consultation.
 *
 * One question at a time, with a progress stepper, large accessible choice
 * cards (radio for single-select, checkbox for the multi-select notes step), a
 * brief processing beat, and real product recommendations.
 *
 * The matching is the project's existing DETERMINISTIC engine (scoreSelections)
 * — the same answers always yield the same ranking, and nothing about a product
 * is invented: scoring runs on the fragrance family, the only classification the
 * catalogue holds. Products are passed in from the server so add-to-cart and
 * wishlist keep working exactly as everywhere else.
 *
 * Motion: step changes fade unless prefers-reduced-motion or the accessibility
 * panel's "עצירת אנימציות" is on, in which case they switch instantly and the
 * processing beat is skipped.
 */

type Phase = 'intro' | 'question' | 'processing' | 'results';

export function FragranceConsultation({
  products,
  totalPublished,
}: {
  products: ProductCardData[];
  totalPublished: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const motionStopped = useA11yMotionStopped();
  const animate = !reducedMotion && !motionStopped;

  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<FinderSelections>({});
  const [error, setError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const question = QUESTIONS[step]!;
  const isLast = step === QUESTIONS.length - 1;
  const chosen = selections[question.id] ?? [];

  const focusHeading = useCallback(() => {
    // Let the DOM update, then move focus to the new question for screen readers.
    requestAnimationFrame(() => headingRef.current?.focus());
  }, []);

  const start = () => {
    setPhase('question');
    setStep(0);
    setError(null);
    focusHeading();
  };

  const toggle = (value: string) => {
    setError(null);
    setSelections((prev) => {
      const current = prev[question.id] ?? [];
      if (question.multiple) {
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [value] };
    });
  };

  const goBack = () => {
    setError(null);
    if (step === 0) {
      setPhase('intro');
      return;
    }
    setStep((s) => s - 1);
    focusHeading();
  };

  const goNext = () => {
    if (chosen.length === 0) {
      setError('יש לבחור תשובה כדי להמשיך.');
      return;
    }
    setError(null);
    if (!isLast) {
      setStep((s) => s + 1);
      focusHeading();
      return;
    }
    // Finished — brief processing beat, then results.
    setPhase('processing');
    const reveal = () => setPhase('results');
    if (animate) {
      window.setTimeout(reveal, 850);
    } else {
      reveal();
    }
  };

  const restart = () => {
    setSelections({});
    setStep(0);
    setError(null);
    setPhase('intro');
  };

  const ranked = useMemo(
    () => (phase === 'results' ? scoreSelections(selections) : []),
    [phase, selections],
  );

  return (
    <section aria-labelledby="finder-heading" className="relative overflow-hidden">
      {/* Restrained atmosphere behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 0%, color-mix(in oklab, var(--color-amber) 16%, transparent) 0%, transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-16">
        {phase === 'intro' && (
          <Intro onStart={start} />
        )}

        {phase === 'question' && (
          <div>
            <Progress step={step} />

            <div
              key={step}
              className={animate ? 'motion-safe:animate-[fadeStep_.35s_ease]' : undefined}
            >
              <fieldset className="mt-8 rounded-2xl border border-gold/20 bg-charcoal/70 p-6 shadow-xl shadow-black/30 sm:p-8">
                <legend className="sr-only">{question.promptHe}</legend>
                <h2
                  id="finder-heading"
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-bold text-ivory outline-none sm:text-3xl"
                >
                  {question.promptHe}
                </h2>
                {question.helpHe && (
                  <p className="mt-2 text-sm text-cream/70">{question.helpHe}</p>
                )}

                <div
                  role={question.multiple ? 'group' : 'radiogroup'}
                  aria-label={question.promptHe}
                  className="mt-6 grid gap-3 sm:grid-cols-2"
                >
                  {question.answers.map((answer) => {
                    const selected = chosen.includes(answer.value);
                    return (
                      <label
                        key={answer.value}
                        className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold ${
                          selected
                            ? 'border-gold bg-gold/10'
                            : 'border-gold/20 bg-ink/30 hover:border-gold/50'
                        }`}
                      >
                        <input
                          type={question.multiple ? 'checkbox' : 'radio'}
                          name={question.id}
                          value={answer.value}
                          checked={selected}
                          onChange={() => toggle(answer.value)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border ${
                            question.multiple ? 'rounded-md' : 'rounded-full'
                          } ${
                            selected ? 'border-gold bg-gold text-ink' : 'border-gold/40 text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-base font-semibold text-ivory">
                            {answer.labelHe}
                          </span>
                          {answer.descriptionHe && (
                            <span className="mt-0.5 block text-sm text-cream/65">
                              {answer.descriptionHe}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {error && (
                  <p role="alert" className="mt-4 text-sm text-danger">
                    {error}
                  </p>
                )}
              </fieldset>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex h-12 items-center gap-2 rounded-sm border border-gold/30 px-5 text-sm text-cream transition-colors hover:border-gold hover:text-ivory"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                חזרה
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-sm bg-gold px-7 text-sm font-medium text-ink transition-colors hover:bg-cream sm:flex-none"
              >
                {isLast ? 'להצגת ההמלצות' : 'המשך'}
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={restart}
                className="text-xs text-muted underline underline-offset-2 hover:text-cream"
              >
                התחלה מחדש
              </button>
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="py-16 text-center">
            <div
              aria-hidden="true"
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/30 text-gold ${
                animate ? 'motion-safe:animate-pulse' : ''
              }`}
            >
              <Sparkles className="h-7 w-7" />
            </div>
            <p ref={liveRef} aria-live="polite" className="mt-6 text-xl font-semibold text-ivory">
              מתאימים עבורכם את הניחוחות
            </p>
            <p className="mt-2 text-sm text-cream/70">
              אנחנו משווים בין ההעדפות שלכם לבין מאפייני הקולקציה.
            </p>
          </div>
        )}

        {phase === 'results' && (
          <Results
            ranked={ranked}
            products={products}
            totalPublished={totalPublished}
            onRestart={restart}
            onChange={() => {
              setPhase('question');
              setStep(QUESTIONS.length - 1);
            }}
          />
        )}
      </div>
    </section>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <p className="text-xs font-medium tracking-[0.16em] text-gold/90 sm:text-sm">התאמה אישית</p>
      <h2 id="finder-heading" className="mt-3 text-3xl font-bold text-ivory sm:text-4xl">
        נמצא את הניחוח שמדבר אליכם
      </h2>
      <p className="mt-4 text-base leading-relaxed text-cream/80">
        ענו על כמה שאלות קצרות ונציע לכם ניחוחות שמתאימים לסגנון, לעוצמה ולרגעים שלכם.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-13 items-center gap-2 rounded-sm bg-gold px-8 text-base font-medium text-ink transition-colors hover:bg-cream"
        >
          להתחלת ההתאמה
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-xs text-muted">
          כ־<span className="ltr-nums">2</span> דקות · <span className="ltr-nums">5</span> שאלות
        </p>
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  const total = QUESTIONS.length;
  const current = step + 1;
  const percent = Math.round((current / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-cream">
          שלב <span className="ltr-nums">{current}</span> מתוך <span className="ltr-nums">{total}</span>
        </span>
        <span className="text-gold">{QUESTIONS[step]!.shortLabelHe}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="התקדמות בשאלון"
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone/70"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out"
          style={{ inlineSize: `${percent}%` }}
        />
      </div>
      {/* Desktop step labels */}
      <ol className="mt-3 hidden justify-between text-xs sm:flex">
        {QUESTIONS.map((q, index) => (
          <li
            key={q.id}
            aria-current={index === step ? 'step' : undefined}
            className={index <= step ? 'text-gold' : 'text-faint'}
          >
            {q.shortLabelHe}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Results({
  ranked,
  products,
  totalPublished,
  onRestart,
  onChange,
}: {
  ranked: ReturnType<typeof scoreSelections>;
  products: ProductCardData[];
  totalPublished: number;
  onRestart: () => void;
  onChange: () => void;
}) {
  const top = ranked.slice(0, 3);
  const topSlugs: string[] = top.map((entry) => entry.family);
  const rankOf = (slug: string | null) => (slug ? topSlugs.indexOf(slug) : 99);

  // Products whose family is among the top three, ordered by family rank.
  const matches = products
    .filter((p) => p.familySlug != null && topSlugs.includes(p.familySlug))
    .sort((a, b) => rankOf(a.familySlug) - rankOf(b.familySlug))
    .slice(0, 6);

  const reasonsFor = (slug: string | null) => {
    const entry = top.find((e) => e.family === slug);
    return entry ? [...new Set(entry.reasonsHe)] : [];
  };
  const strengthFor = (slug: string | null) => (slug === topSlugs[0] ? 'התאמה גבוהה' : 'התאמה טובה');

  if (matches.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h2 id="finder-heading" tabIndex={-1} className="text-2xl font-bold text-ivory outline-none sm:text-3xl">
          לא מצאנו התאמה מדויקת
        </h2>
        <p className="mt-3 text-sm text-cream/75">
          {totalPublished > 0
            ? 'נסו לשנות חלק מהתשובות, או עיינו בכל הקולקציה.'
            : 'הקטלוג יתעדכן בקרוב. בינתיים נשמח שתשאירו פרטים ליצירת קשר.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onChange}
            className="inline-flex h-12 items-center rounded-sm bg-gold px-6 text-sm font-medium text-ink hover:bg-cream"
          >
            לשינוי התשובות
          </button>
          <Link
            href="/shop"
            className="inline-flex h-12 items-center rounded-sm border border-gold/35 px-6 text-sm text-cream hover:border-gold"
          >
            לצפייה בכל הבשמים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-medium tracking-[0.16em] text-gold/90">ההמלצות שלכם</p>
        <h2
          id="finder-heading"
          tabIndex={-1}
          aria-live="polite"
          className="mt-3 text-3xl font-bold text-ivory outline-none sm:text-4xl"
        >
          הניחוחות שמתאימים לכם
        </h2>
        <p className="mt-3 text-sm text-cream/75">
          בחרנו את הניחוחות הקרובים ביותר להעדפות שסימנתם.
        </p>
      </div>

      <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((product) => {
          const reasons = reasonsFor(product.familySlug);
          return (
            <div key={product.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">
                  {strengthFor(product.familySlug)}
                </span>
                {product.familyNameHe && (
                  <span className="text-xs text-muted">{product.familyNameHe}</span>
                )}
              </div>
              <ProductCard product={product} />
              <div className="mt-3 rounded-lg border border-gold/12 bg-charcoal/50 p-3">
                <p className="text-xs font-semibold text-cream">למה הוא מתאים לכם</p>
                <ul className="mt-1.5 flex flex-col gap-1 text-xs text-cream/70">
                  <li className="flex gap-1.5">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-gold" aria-hidden="true" />
                    שייך למשפחת {product.familyNameHe ?? 'הניחוח שבחרתם'}
                  </li>
                  {reasons.slice(0, 2).map((reason) => (
                    <li key={reason} className="flex gap-1.5">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-gold" aria-hidden="true" />
                      מתאים להעדפה: {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onChange}
          className="inline-flex h-12 items-center gap-2 rounded-sm border border-gold/35 px-6 text-sm text-cream hover:border-gold hover:text-ivory"
        >
          לשינוי התשובות
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-12 items-center gap-2 rounded-sm border border-gold/35 px-6 text-sm text-cream hover:border-gold hover:text-ivory"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          התחלה מחדש
        </button>
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-faint">
        ההתאמה מבוססת על משפחת הניחוח ועל ההעדפות שסומנו. פירוט התווים המאומת של
        כל ניחוח מופיע בעמוד המוצר ומאפשר להעמיק לפני הבחירה.
      </p>
    </div>
  );
}
