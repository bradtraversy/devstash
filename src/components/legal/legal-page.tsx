import type { Metadata } from "next";
import Navbar from "@/components/homepage/Navbar";
import Footer from "@/components/homepage/Footer";
import MarkdownBlock from "@/components/public/markdown-block";
import { LEGAL_PAGES, readLegalMarkdown, type LegalPage as LegalPageInfo } from "@/lib/legal";

export function legalMetadata(slug: LegalPageInfo["slug"]): Metadata {
  const page = LEGAL_PAGES[slug];
  return {
    title: `${page.title} | DevStash`,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
  };
}

export default async function LegalPage({ slug }: { slug: LegalPageInfo["slug"] }) {
  const page = LEGAL_PAGES[slug];
  const markdown = await readLegalMarkdown(slug);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#e4e4ef]">
      <Navbar />
      <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-24">
        <article className="docs-content mx-auto max-w-[calc(70ch+4rem)] rounded-2xl border border-[#1e1e2e] bg-[#0f0f16] p-2 sm:p-4">
          <header className="px-4 pt-4">
            <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
            <p className="mt-3 text-sm text-[#8888a4]">Last updated {page.updated}</p>
          </header>
          <MarkdownBlock content={markdown} />
        </article>
      </div>
      <Footer />
    </main>
  );
}
