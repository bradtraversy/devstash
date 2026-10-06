import Link from "next/link";
import { FileText, Image as ImageIcon, Download } from "lucide-react";
import ItemBlock from "@/components/public/item-block";
import { languageLabel } from "@/lib/languages";
import { publicCollectionPath, publicShortPath } from "@/lib/public/paths";
import BrowserFrame, { StaticSaveButton } from "./BrowserFrame";
import ScrollFadeIn from "./ScrollFadeIn";
import { LIVE_EXAMPLE_PATH, SAMPLE_COLLECTION, SAMPLE_ITEM, SAMPLE_NOTE } from "./samples";

function SnippetPage() {
  return (
    <div className="space-y-4 p-5 [&_pre]:text-xs [&_pre]:leading-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
          <span>@{SAMPLE_ITEM.handle}</span>
          <span aria-hidden="true">·</span>
          <span>{languageLabel(SAMPLE_ITEM.language)}</span>
        </p>
        <StaticSaveButton />
      </div>
      <ItemBlock item={SAMPLE_ITEM} standalone headingLevel="h3" />
      <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          Raw
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4" />
          Image
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Download className="h-4 w-4" />
          Download
        </span>
      </p>
    </div>
  );
}

function NotePage() {
  return (
    // The note's headings sit at h5 under the frame's h4 title; prose leaves h5 unstyled.
    <div className="space-y-4 p-5 [&_pre]:text-xs [&_pre]:leading-5 [&_h5]:font-semibold [&_h5]:text-[#e4e4ef]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
          <span>@{SAMPLE_NOTE.handle}</span>
          <span aria-hidden="true">·</span>
          <span>Note</span>
        </p>
        <StaticSaveButton />
      </div>
      <ItemBlock item={SAMPLE_NOTE} standalone headingLevel="h4" />
    </div>
  );
}

function CollectionPage() {
  return (
    <div className="space-y-5 p-5 [&_pre]:text-xs [&_pre]:leading-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-tight text-foreground">{SAMPLE_COLLECTION.name}</h3>
          <StaticSaveButton compact />
        </div>
        <p className="text-sm text-muted-foreground">{SAMPLE_COLLECTION.description}</p>
        <p className="flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
          <span>@{SAMPLE_COLLECTION.handle}</span>
          <span aria-hidden="true">·</span>
          <span>{SAMPLE_COLLECTION.itemCount} items</span>
        </p>
      </header>
      <div className="space-y-3">
        {SAMPLE_COLLECTION.items.map((item, index) => (
          <ItemBlock key={item.id} item={item} position={index + 1} headingLevel="h4" />
        ))}
      </div>
    </div>
  );
}

export default function SharedViewSection() {
  return (
    <section id="shared-view" className="py-[120px] bg-[#12121a] scroll-mt-16">
      {/* Anchors inside the samples land below the fixed navbar. */}
      <div className="max-w-[1200px] mx-auto px-6 [&_[id]]:scroll-mt-20">
        <ScrollFadeIn className="text-center">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            What people see when you share
          </h2>
          <p className="text-base text-[#8888a4] max-w-[560px] mx-auto mb-14 leading-relaxed">
            A clean page with real syntax highlighting and a copy button on every block. Nothing to
            sign up for to read it.
          </p>
        </ScrollFadeIn>

        <div className="grid grid-cols-2 items-start gap-6 max-lg:grid-cols-1">
          <figure className="space-y-3">
            <BrowserFrame path={publicShortPath(SAMPLE_ITEM.shortId)}>
              <SnippetPage />
            </BrowserFrame>
            <figcaption className="text-sm text-[#8888a4]">A single snippet, shared from the Share button or the drawer.</figcaption>
          </figure>
          <figure className="space-y-3">
            <BrowserFrame path={publicCollectionPath(SAMPLE_COLLECTION.handle, SAMPLE_COLLECTION.slug)}>
              <CollectionPage />
            </BrowserFrame>
            <figcaption className="text-sm text-[#8888a4]">
              A collection as one page, every block in the order you set.
            </figcaption>
          </figure>
        </div>

        <ScrollFadeIn className="mt-24 text-center">
          <h3 className="text-[clamp(1.5rem,2.8vw,2.2rem)] font-extrabold leading-tight mb-4 tracking-tight">
            Whole gists, one page
          </h3>
          <p className="text-base text-[#8888a4] max-w-[560px] mx-auto mb-10 leading-relaxed">
            Paste a markdown doc or gist as a note and share it as one page, with a Copy button on every code
            block and a link on every heading.
          </p>
        </ScrollFadeIn>
        <div className="mx-auto max-w-3xl">
          <BrowserFrame path={publicShortPath(SAMPLE_NOTE.shortId)}>
            <NotePage />
          </BrowserFrame>
        </div>

        <p className="mt-12 text-center">
          <Link
            href={LIVE_EXAMPLE_PATH}
            className="text-sm font-medium text-[#e4e4ef] underline decoration-[#55556a] underline-offset-4 hover:decoration-[#e4e4ef]"
          >
            See a real one
          </Link>
        </p>
      </div>
    </section>
  );
}
