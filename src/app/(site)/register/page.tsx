import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { RegisterForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'יצירת חשבון' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/account');

  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-4xl text-ivory">יצירת חשבון</h1>
        <p className="mt-3 text-sm text-muted">
          חשבון מאפשר מעקב אחר הזמנות, שמירת כתובות ורשימת משאלות.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
