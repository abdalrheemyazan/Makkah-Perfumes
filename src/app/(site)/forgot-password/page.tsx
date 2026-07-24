import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'איפוס סיסמה' };

export default function ForgotPasswordPage() {
  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-4xl text-ivory">איפוס סיסמה</h1>
        <p className="mt-3 text-sm text-muted">
          הזינו את כתובת הדוא״ל שלכם ונשלח קישור לאיפוס הסיסמה.
        </p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
