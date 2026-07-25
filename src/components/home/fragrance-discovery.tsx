import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Fragrance discovery.
 *
 * Replaces two earlier sections — a seven-cell family card grid and a separate
 * finder call-to-action — with one editorial moment. Two adjacent blocks both
 * asking "which scent are you?" competed with each other and made the page feel
 * stacked; merging them gives the question a single, clearer answer.
 *
 * Structure: a centred statement, then the families as quiet pills rather than
 * cards, then one unmistakable route into the guided finder. The pills are real
 * links to filtered catalogue views, so browsing works for visitors who already
 * know what they like, while the finder serves those who do not.
 */

export type DiscoveryFamily = {
  id: string;
  slug: string;
  nameHe: string;
  descriptionHe: string | null;
  accentColor: string | null;
  count: number;
};

export function FragranceDiscovery({ families }: { families: DiscoveryFamily[] }) {
  return (
    <section
      aria-labelledby="discovery-heading"
      className="relative overflow-hidden border-y border-gold/10 bg-charcoal py-28 lg:py-36"
    >
      {/* A single soft pool of light, centred — keeps the section calm. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, color-mix(in oklab, var(--color-amber) 22%, transparent), transparent 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[110rem] px-5 sm:px-8 lg:px-12">
        {/* ---- Statement ---- */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs tracking-[0.16em] text-gold/90 sm:text-sm">
            התאמת ניחוח
          </p>
          <h2
            id="discovery-heading"
            className="mt-6 font-serif text-4xl leading-[1.12] text-ivory sm:text-5xl lg:text-6xl"
          >
            למצוא את השפה שמדברת אליכם
          </h2>
          <p className="mt-6 text-base leading-[1.9] text-cream/75 sm:text-lg">
            כל בושם מדבר בשפה אחרת. בחרו כיוון שמסקרן אתכם — או תנו לנו לשאול
            חמש שאלות קצרות ולהציע במקומכם.
          </p>
        </div>

        {/* ---- Families as pills ---- */}
        {families.length > 0 && (
          <>
            <ul className="mx-auto mt-14 flex max-w-5xl flex-wrap justify-center gap-2.5 sm:gap-3">
              {families.map((family) => (
                <li key={family.id}>
                  <Link
                    href={`/shop?family=${family.slug}`}
                    className="group inline-flex items-center gap-2.5 rounded-full border border-gold/20 bg-ink/40 py-2.5 ps-4 pe-3.5 transition-colors duration-300 hover:border-gold/55 hover:bg-ink/70"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125"
                      style={{
                        background: family.accentColor ?? 'var(--color-gold)',
                        boxShadow: `0 0 12px ${family.accentColor ?? 'var(--color-gold)'}55`,
                      }}
                    />
                    <span className="text-sm text-cream/90 transition-colors group-hover:text-ivory">
                      {family.nameHe}
                    </span>
                    <span className="ltr-nums text-xs text-faint">{family.count}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* One family expanded as an editorial note, so the pills are not
                the only thing carrying meaning. */}
            {families[0]?.descriptionHe && (
              <p className="mx-auto mt-10 max-w-md text-center text-sm leading-relaxed text-muted">
                <span className="text-cream/80">{families[0].nameHe}</span>
                <span className="mx-2 text-faint" aria-hidden="true">
                  ·
                </span>
                {families[0].descriptionHe}
              </p>
            )}
          </>
        )}

        {/* ---- The guided route ---- */}
        <div className="mx-auto mt-16 max-w-2xl lg:mt-20">
          <div className="rule-brass" />
          <div className="mt-10 flex flex-col items-center text-center">
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              לא בטוחים מאיפה להתחיל? נבנה לכם המלצה לפי סגנון, עוצמה והזדמנות.
            </p>
            <Link
              href="/fragrance-finder"
              className="group mt-7 inline-flex h-13 items-center gap-3 rounded-sm bg-gold px-8 text-base font-medium text-ink transition-colors duration-200 hover:bg-cream"
            >
              להתחלת ההתאמה
              <ArrowLeft
                className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <p className="mt-4 text-xs text-faint">חמש שאלות · ללא הרשמה</p>
          </div>
        </div>
      </div>
    </section>
  );
}
