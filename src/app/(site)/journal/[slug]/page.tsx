import { permanentRedirect } from 'next/navigation';

/** All former article URLs resolve to the current brand story. */
export default function JournalPostPage() {
  permanentRedirect('/about');
}
