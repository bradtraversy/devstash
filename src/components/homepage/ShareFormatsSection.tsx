import Image from "next/image";
import ItemBlock from "@/components/public/item-block";
import {
  publicCollectionPath,
  publicMarkdownPath,
  publicShortPath,
  publicShortPngPath,
  publicShortRawPath,
} from "@/lib/public/paths";
import sampleImage from "../../../public/homepage/sample-image.png";
import FormatExplorer, { type LinkFormat } from "./FormatExplorer";
import ScrollFadeIn from "./ScrollFadeIn";
import { DISPLAY_ORIGIN, SAMPLE_COLLECTION, SAMPLE_ITEM } from "./samples";

const { shortId } = SAMPLE_ITEM;
const pagePath = publicShortPath(shortId);
const rawPath = publicShortRawPath(shortId);

function RawPanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]">
      <div className="border-b border-[#1e1e2e] bg-[#12121a] px-4 py-2.5 font-mono text-xs text-[#8888a4]">Terminal</div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-[#c8c8d8]">
        <span className="text-[#10b981]">$ </span>
        {`curl -s https://${DISPLAY_ORIGIN}${rawPath}\n`}
        {(SAMPLE_ITEM.content ?? "").trimEnd()}
      </pre>
    </div>
  );
}

function linkFormats(): LinkFormat[] {
  return [
    {
      key: "page",
      label: "page",
      suffix: "",
      caption: "The page: highlighted, with a copy button, readable on any device.",
      panel: <ItemBlock item={SAMPLE_ITEM} standalone headingLevel="h3" />,
    },
    {
      key: "raw",
      label: rawPath.slice(pagePath.length),
      suffix: rawPath.slice(pagePath.length),
      caption: "Plain text for curl, scripts, and anything that just wants the code.",
      panel: <RawPanel />,
    },
    {
      key: "png",
      label: publicShortPngPath(shortId).slice(pagePath.length),
      suffix: publicShortPngPath(shortId).slice(pagePath.length),
      caption: "The whole snippet as an image for posts, slides, and docs.",
      panel: (
        <Image
          src={sampleImage}
          alt="The useDebounce hook rendered as a PNG with its title, language, and short link"
          className="h-auto w-full rounded-xl border border-[#1e1e2e]"
        />
      ),
    },
  ];
}

export default function ShareFormatsSection() {
  const collectionPath = publicCollectionPath(SAMPLE_COLLECTION.handle, SAMPLE_COLLECTION.slug);
  const markdownPath = publicMarkdownPath(SAMPLE_COLLECTION.handle, SAMPLE_COLLECTION.slug);

  return (
    <section id="sharing" className="py-[120px] text-center bg-[#0a0a0f] scroll-mt-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollFadeIn>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            One link, every format
          </h2>
          <p className="text-base text-[#8888a4] max-w-[560px] mx-auto mb-14 leading-relaxed">
            Every shared snippet gets a short link that never changes. Change the end of it to get
            the format you need.
          </p>
        </ScrollFadeIn>

        <FormatExplorer origin={DISPLAY_ORIGIN} prefix={pagePath.slice(0, -shortId.length)} shortId={shortId} formats={linkFormats()} />

        <p className="mx-auto mt-14 max-w-[640px] text-base leading-relaxed text-[#8888a4]">
          Collections get a readable address too:{" "}
          <span className="break-all font-mono text-[#e4e4ef]">
            {DISPLAY_ORIGIN}
            {collectionPath}
          </span>{" "}
          is one ordered page, and{" "}
          <span className="font-mono text-[#10b981]">{markdownPath.slice(collectionPath.length)}</span>{" "}
          on the end gives you the same collection as markdown.
        </p>
      </div>
    </section>
  );
}
