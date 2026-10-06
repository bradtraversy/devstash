import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import MarkdownBlock from "@/components/public/markdown-block";
import { DOC_PAGES, docNeighbors, getDocPage, readDocMarkdown } from "@/lib/docs";

export function generateStaticParams() {
  return DOC_PAGES.map(({ slug }) => ({ slug }));
}

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const page = getDocPage((await params).slug);
  if (!page) return {};
  return {
    title: `${page.title} | DevStash Docs`,
    description: page.description,
    alternates: { canonical: `/docs/${page.slug}` },
  };
}

const NEIGHBOR_CLASS =
  "flex flex-col gap-1 rounded-xl border border-[#1e1e2e] bg-[#12121a] px-5 py-4 transition-colors hover:border-[#2e2e44] hover:bg-[#16161f]";

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const page = getDocPage(slug);
  if (!page) notFound();

  const markdown = await readDocMarkdown(slug);
  const { previous, next } = docNeighbors(slug);

  return (
    <article className="max-w-[calc(70ch+4rem)]">
      <div className="docs-content rounded-2xl border border-[#1e1e2e] bg-[#0f0f16] p-2 sm:p-4">
        <header className="px-4 pt-4">
          <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
          <p className="mt-3 text-[#8888a4]">{page.description}</p>
        </header>
        <MarkdownBlock content={markdown} />
      </div>
      <nav aria-label="Previous and next page" className="mt-6 grid gap-4 sm:grid-cols-2">
        {previous && (
          <Link href={`/docs/${previous.slug}`} className={NEIGHBOR_CLASS}>
            <span className="flex items-center gap-1.5 text-xs text-[#8888a4]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </span>
            <span className="font-medium">{previous.title}</span>
          </Link>
        )}
        {next && (
          <Link href={`/docs/${next.slug}`} className={`${NEIGHBOR_CLASS} sm:col-start-2 sm:items-end sm:text-right`}>
            <span className="flex items-center gap-1.5 text-xs text-[#8888a4]">
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
