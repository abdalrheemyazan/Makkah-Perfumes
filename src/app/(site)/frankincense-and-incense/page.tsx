import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'עולם הלבונה והקטורת' };

export default function Page() {
  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl text-ivory sm:text-5xl">עולם הלבונה והקטורת</h1>
        <p className="mt-6 text-base leading-relaxed text-cream/85">
          שרף הלבונה נאסף מגזעי עצי בוסוואליה הגדלים בדרום ערב ובקרן אפריקה.
          החתך בגזע מפריש שרף שמתקשה באוויר לטיפות ענבריות, ואלה נשרפות על גחלת
          או נכנסות לתמצית הבושם.
        </p>
        <p className="mt-4 text-base leading-relaxed text-cream/85">
          בפרופיל הריח הלבונה נפתחת הדרית וטרפנטינית, ומתייצבת ליובש שרפי וחמים
          עם נגיעה חלבית. היא משמשת גם כתו פתיחה וגם כעוגן בבסיס.
        </p>
        <p className="mt-8 text-sm text-muted">
          <Link href="/shop?family=leather-incense" className="text-gold underline underline-offset-2 hover:text-cream">
            לצפייה בבשמים ממשפחת עור וקטורת
          </Link>
        </p>
      </div>
    </div>
  );
}
