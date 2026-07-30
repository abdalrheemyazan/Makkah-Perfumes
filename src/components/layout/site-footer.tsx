import Link from 'next/link';
import Image from 'next/image';
import { FOOTER_NAV, SITE } from '@/lib/site';
import { NewsletterForm } from '@/components/newsletter-form';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-gold/15 bg-charcoal">
      <div className="container-editorial py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          {/* Brand + newsletter */}
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/brand-reference/logo/logo-ivory.png"
                alt={SITE.nameEn}
                width={512}
                height={438}
                className="h-14 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70">
              {SITE.descriptionHe}
            </p>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-ivory">הניחוחות החדשים, לפני כולם</h2>
              <NewsletterForm />
            </div>
          </div>

          {/* Link columns — DOM order flows right-to-left under dir="rtl". */}
          <nav aria-label="ניווט תחתון">
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {FOOTER_NAV.map((group) => (
                <div key={group.titleHe}>
                  <h2 className="text-sm font-semibold tracking-wide text-gold">{group.titleHe}</h2>
                  <ul className="mt-4 flex flex-col gap-3">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="text-sm text-cream/70 transition-colors hover:text-ivory"
                        >
                          {item.labelHe}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>

        <div className="rule-brass mt-14" />

        <div className="mt-6 text-xs text-faint">
          <p>
            © {year} {SITE.nameEn}. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}
