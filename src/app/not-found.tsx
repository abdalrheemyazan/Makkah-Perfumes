import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="he" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-[#0b0a08] text-[#f2ebdd]">
        <div className="mx-auto max-w-md px-6 text-center">
          <p className="text-sm tracking-[0.2em] text-[#b38a52] uppercase">שגיאה 404</p>
          <h1 className="mt-4 text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
            העמוד לא נמצא
          </h1>
          <p className="mt-4 text-sm text-[#a2978a]">
            ייתכן שהקישור שגוי או שהעמוד הוסר.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-sm bg-[#b38a52] px-5 text-sm font-medium text-[#0b0a08]"
            >
              לעמוד הבית
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-11 items-center rounded-sm border border-[#b38a52]/45 px-5 text-sm text-[#e6d8c1]"
            >
              לחנות
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
