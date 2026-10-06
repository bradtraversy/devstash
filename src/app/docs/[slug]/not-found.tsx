import Link from "next/link";

export default function DocNotFound() {
  return (
    <div className="px-4">
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 text-[#8888a4]">There is no docs page at this address.</p>
      <Link href="/docs" className="mt-6 inline-block text-sm text-blue-400 hover:text-blue-300">
        Browse the docs
      </Link>
    </div>
  );
}
