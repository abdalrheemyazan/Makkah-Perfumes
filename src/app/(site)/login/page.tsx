import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'התחברות' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/account');

  return (
    <div className="container-editorial pt-32 pb-24">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-4xl text-ivory">התחברות</h1>
        <p className="mt-3 text-sm text-muted">התחברו כדי לצפות בהזמנות ולשמור מוצרים.</p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
