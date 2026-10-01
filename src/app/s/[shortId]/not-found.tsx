import Link from 'next/link';
import { Link2Off } from 'lucide-react';

export default function ShortLinkNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-4 text-center">
        <Link2Off className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">Nothing here</h1>
        <p className="text-muted-foreground">This link is private or does not exist.</p>
        <Link href="/" className="inline-block text-sm text-blue-400 hover:underline">
          Go to DevStash
        </Link>
      </div>
    </main>
  );
}
