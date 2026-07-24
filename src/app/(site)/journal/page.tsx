import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'מגזין' };

export default function Page() {
  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">מגזין</h1>
        <p className="mt-6 text-base leading-relaxed text-cream/85">
          כתבות על חומרי גלם, מסורות בישום ודרכי שימוש.
        </p>
        <p className="mt-8 text-sm text-muted">עדיין לא פורסמו כתבות.</p>
      </div>
    </div>
  );
}
