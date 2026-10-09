import Link from 'next/link';
import { UserRound } from 'lucide-react';

export default function PublicProfileNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-4 text-center">
        <UserRound className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">Not found</h1>
        <p className="text-muted-foreground">
          There is no public profile or page at this address.
        </p>
        <Link href="/" className="inline-block text-sm text-blue-400 hover:underline">
          Go to DevStash
        </Link>
      </div>
    </main>
  );
}
