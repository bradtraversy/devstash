import Link from 'next/link';
import { FolderOpen } from 'lucide-react';

export default function PublicCollectionNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-4 text-center">
        <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">Collection not found</h1>
        <p className="text-muted-foreground">
          This collection is private or does not exist.
        </p>
        <Link href="/" className="inline-block text-sm text-blue-400 hover:underline">
          Go to DevStash
        </Link>
      </div>
    </main>
  );
}
