import { permanentRedirect } from 'next/navigation';

/** Legacy public URL retained only as a permanent redirect. */
export default function StoresPage() {
  permanentRedirect('/contact');
}
