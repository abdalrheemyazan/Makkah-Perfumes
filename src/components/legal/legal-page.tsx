import type { ReactNode } from 'react';
import Link from 'next/link';
import { PageIdentity } from '@/components/layout/page-identity';

export type LegalSection = {
  id: string;
  titleHe: string;
  content: ReactNode;
};

export function LegalPage({
  titleHe,
  lastUpdatedHe,
  introHe,
  sections,
}: {
  titleHe: string;
  lastUpdatedHe: string;
  introHe: string;
  sections: readonly LegalSection[];
}) {
  return (
    <>
      <PageIdentity
        titleHe={titleHe}
        breadcrumb={[{ labelHe: 'בית', href: '/' }, { labelHe: titleHe }]}
      />
      <div className="container-editorial pt-10 pb-24">
        <div className="grid items-start gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:sticky lg:top-28 lg:block" aria-label="תוכן העניינים">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold">תוכן העניינים</p>
            <ol className="mt-5 flex flex-col gap-2.5 border-s border-gold/20 ps-5">
              {sections.map((section) => (
                <li key={section.id}>
                  <Link
                    href={`#${section.id}`}
                    className="text-sm leading-snug text-muted transition-colors hover:text-ivory"
                  >
                    {section.titleHe}
                  </Link>
                </li>
              ))}
            </ol>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <p className="text-xs text-faint">עודכן לאחרונה: {lastUpdatedHe}</p>
            <p className="mt-5 text-base leading-[1.9] text-cream/85">{introHe}</p>
            <div className="rule-brass mt-10" />

            <div className="mt-2">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="border-b border-gold/10 py-9 last:border-0">
                  <h2 className="text-xl font-semibold text-ivory sm:text-2xl">{section.titleHe}</h2>
                  <div className="mt-4 flex flex-col gap-4 text-[0.95rem] leading-[1.9] text-cream/80 [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2 [&_li]:ps-1 [&_strong]:font-semibold [&_strong]:text-ivory">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
