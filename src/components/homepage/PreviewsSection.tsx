import Image from "next/image";
import { CircleCheck } from "lucide-react";
import { publicShortPath } from "@/lib/public/paths";
import sampleCard from "../../../public/homepage/sample-card.png";
import { StaticSaveButton } from "./BrowserFrame";
import ScrollFadeIn from "./ScrollFadeIn";
import { DISPLAY_ORIGIN, SAMPLE_ITEM } from "./samples";

function ChatMessage() {
  const link = `https://${DISPLAY_ORIGIN}${publicShortPath(SAMPLE_ITEM.shortId)}`;

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-5 text-left">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#6366f1] font-bold text-white" aria-hidden="true">
          J
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-bold text-[#e4e4ef]">jordan</span>
            <span className="ml-2 text-xs text-[#55556a]">10:42 AM</span>
          </p>
          <p className="mt-0.5 text-[15px] text-[#c8c8d8]">
            Here&apos;s the debounce hook from standup{" "}
            <span className="break-all text-[#4ea1f3]">{link}</span>
          </p>
          <div className="mt-2 border-l-4 border-[#2a2a3a] pl-3">
            <p className="text-sm font-bold text-[#e4e4ef]">DevStash</p>
            <p className="text-[15px] font-bold text-[#4ea1f3]">{SAMPLE_ITEM.title}</p>
            <p className="mb-2 text-sm text-[#a1a1b5]">{SAMPLE_ITEM.description}</p>
            <Image
              src={sampleCard}
              alt="The link preview card: useDebounce hook, its first lines of code, @sam, devstash.io"
              className="h-auto w-full max-w-[460px] rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreviewsSection() {
  return (
    <section className="py-[120px] bg-[#0a0a0f]">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollFadeIn className="text-center">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            Looks right wherever you paste it
          </h2>
          <p className="text-base text-[#8888a4] max-w-[560px] mx-auto mb-14 leading-relaxed">
            Every link unfurls into a preview card with the code on it, in Slack, X, Discord, and
            iMessage.
          </p>
        </ScrollFadeIn>

        <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-center gap-12 max-lg:grid-cols-1">
          <ChatMessage />

          <div className="space-y-5">
            <h3 className="text-2xl font-bold tracking-tight text-[#e4e4ef]">Found something useful? Keep a copy.</h3>
            <p className="leading-relaxed text-[#8888a4]">
              Save to your stash copies a shared snippet, or a whole collection, into your own
              account. Your copy stays private until you share it.
            </p>
            <div className="space-y-3">
              <StaticSaveButton />
              <div
                className="flex w-full max-w-[340px] items-center gap-3 rounded-lg border border-[#1e1e2e] bg-[#12121a] px-4 py-3 text-sm shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)]"
                aria-hidden="true"
              >
                <CircleCheck className="size-4 shrink-0 text-[#10b981]" />
                <span className="flex-1 text-[#e4e4ef]">Saved to your stash</span>
                <span className="rounded-md bg-[#e4e4ef] px-2 py-1 text-xs font-medium text-[#0a0a0f]">Open</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
