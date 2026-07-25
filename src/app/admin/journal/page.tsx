import { redirect } from 'next/navigation';

/**
 * This admin area was removed from the simplified store admin. The route is kept
 * as a redirect (rather than a 404) so any stale link lands on the dashboard.
 * The underlying data and server actions are preserved — see docs/ADMIN.md.
 */
export default function Page() {
  redirect('/admin');
}
