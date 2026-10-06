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
  "flex items-center gap-2 text-sm text-[#8888a4] transition-colors hover:text-[#e4e4ef]";

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const page = getDocPage(slug);
  if (!page) notFound();

  const markdown = await readDocMarkdown(slug);
  const { previous, next } = docNeighbors(slug);

  return (
    // -mx-4 lines the text up with the docs nav; the markdown block brings its own p-4.
    <article className="-mx-4">
      <header className="px-4">
        <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        <p className="mt-3 max-w-2xl text-[#8888a4]">{page.description}</p>
      </header>
      <MarkdownBlock content={markdown} />
      <nav
        aria-label="Previous and next page"
        className="mx-4 mt-12 flex items-center justify-between gap-4 border-t border-white/10 pt-6"
      >
        {previous ? (
          <Link href={`/docs/${previous.slug}`} className={NEIGHBOR_CLASS}>
            <ArrowLeft className="h-4 w-4" />
            {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/docs/${next.slug}`} className={NEIGHBOR_CLASS}>
            {next.title}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </article>
  );
}
