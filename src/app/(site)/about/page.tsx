import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'הסיפור שלנו' };

export default function Page() {
  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">הסיפור שלנו</h1>
        <p className="mt-6 text-base leading-relaxed text-cream/85">
          מכה פרפיומס נושאת על התוויות שלה את הכיתוב <span dir="ltr">SINCE 1976</span>.
          שפת הבישום שלה נשענת על חומרי הגלם הקלאסיים של דרום ערב — לבונה, עוד,
          ענבר ועצים.
        </p>
        <div role="note" className="mt-8 rounded-sm border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-warning">
          <p className="font-medium">סיפור המותג המלא טרם אושר</p>
          <p className="mt-1.5">
            כדי לא לפרסם מידע היסטורי שלא אומת, העמוד מציג רק את מה שמופיע על
            המוצרים עצמם. הטקסט המלא ניתן לעריכה מלוח הניהול.
          </p>
        </div>
      </div>
    </div>
  );
}
