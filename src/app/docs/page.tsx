import type { Metadata } from "next";
import Link from "next/link";
import { DOC_PAGES } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Docs | DevStash",
  description: "How to save, find, and share snippets, commands, prompts, notes, and links with DevStash.",
  alternates: { canonical: "/docs" },
};

export default function DocsIndexPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight">DevStash docs</h1>
      <p className="mt-3 max-w-2xl text-[#8888a4]">
        How to save, find, and share snippets, commands, prompts, notes, and links. Start with Getting started, or jump
        to the part you need.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {DOC_PAGES.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/docs/${page.slug}`}
              className="block h-full rounded-xl border border-[#1e1e2e] bg-[#12121a] p-5 transition-colors hover:border-[#2e2e44] hover:bg-[#16161f]"
            >
              <h2 className="font-semibold">{page.title}</h2>
              <p className="mt-1.5 text-sm text-[#8888a4]">{page.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
