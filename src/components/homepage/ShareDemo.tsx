"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Check, Code, Link2, Terminal } from "lucide-react";
import { publicShortPath } from "@/lib/public/paths";
import sampleImage from "../../../public/homepage/sample-image.png";
import { DISPLAY_ORIGIN, SAMPLE_ITEM } from "./samples";

const CODE_LINES = (SAMPLE_ITEM.content ?? "").trimEnd().split("\n");
const LINK = `${DISPLAY_ORIGIN}${publicShortPath(SAMPLE_ITEM.shortId)}`;

// Typing, pressing Share, the link, then the image; the full picture holds before the next loop.
type Phase = "typing" | "pressing" | "linked" | "imaged";

const LINE_MS = 110;
const HOLD_MS: Record<Exclude<Phase, "typing">, number> = {
  pressing: 450,
  linked: 1100,
  imaged: 4200,
};
const FIRST_HOLD_MS = 2600;
// Auto-playing content has to stop on its own (WCAG 2.2.2), so the demo rests on the finished frame.
const MAX_LOOPS = 3;

interface DemoState {
  phase: Phase;
  lines: number;
  loop: number;
}

// The server renders the finished state, so the page reads complete without JavaScript or motion.
const FINISHED: DemoState = { phase: "imaged", lines: CODE_LINES.length, loop: 0 };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function nextState(state: DemoState): DemoState {
  switch (state.phase) {
    case "typing":
      return state.lines < CODE_LINES.length
        ? { ...state, lines: state.lines + 1 }
        : { ...state, phase: "pressing" };
    case "pressing":
      return { ...state, phase: "linked" };
    case "linked":
      return { ...state, phase: "imaged" };
    case "imaged":
      return { phase: "typing", lines: 0, loop: state.loop + 1 };
  }
}

function delayFor(state: DemoState): number {
  if (state.phase === "typing") return state.lines === 0 ? 500 : LINE_MS;
  if (state.phase === "imaged" && state.loop === 0) return FIRST_HOLD_MS;
  return HOLD_MS[state.phase];
}

export default function ShareDemo() {
  const [playing, setPlaying] = useState<DemoState>(FINISHED);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true
  );
  const state = reducedMotion ? FINISHED : playing;

  useEffect(() => {
    if (reducedMotion) return;
    if (playing.phase === "imaged" && playing.loop >= MAX_LOOPS) return;
    const timer = setTimeout(() => setPlaying(nextState), delayFor(playing));
    return () => clearTimeout(timer);
  }, [playing, reducedMotion]);

  const shared = state.phase === "linked" || state.phase === "imaged";

  return (
    <div className="grid w-full max-w-[1120px] grid-cols-2 items-center gap-6 text-left max-xl:max-w-[640px] max-xl:grid-cols-1">
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-semibold text-[#e4e4ef]">Share a snippet</p>
          <div className="flex rounded-md border border-[#1e1e2e] p-0.5 text-xs max-sm:hidden" aria-hidden="true">
            <span className="flex items-center gap-1 rounded bg-[#1e1e2e] px-2 py-1 text-[#e4e4ef]">
              <Code className="size-3.5" />
              Code
            </span>
            <span className="flex items-center gap-1 px-2 py-1 text-[#55556a]">
              <Terminal className="size-3.5" />
              Command
            </span>
          </div>
        </div>

        <pre className="h-[242px] overflow-x-auto overflow-y-hidden rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] p-3 font-mono text-[12px] leading-[18px] text-[#c8c8d8]">
          {CODE_LINES.slice(0, state.lines).join("\n")}
          {state.phase === "typing" && <span className="ml-px inline-block h-[14px] w-[7px] translate-y-[3px] bg-[#3b82f6]" />}
        </pre>

        <div className="mt-4 flex h-9 items-center gap-3">
          {shared ? (
            <>
              <p className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-2 font-mono text-sm text-[#10b981]">
                <Link2 className="size-4 shrink-0" />
                <span className="truncate">{LINK}</span>
              </p>
              <p className="flex shrink-0 items-center gap-1 text-sm text-[#8888a4]">
                <Check className="size-4 text-[#10b981]" />
                Link copied
              </p>
            </>
          ) : (
            <>
              <span className="flex-1 font-mono text-xs text-[#8888a4]">TypeScript</span>
              <span
                className={`rounded-md bg-gradient-to-r from-blue-800 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-transform duration-150 ${state.phase === "pressing" ? "scale-95 opacity-80" : ""}`}
              >
                Share
              </span>
            </>
          )}
        </div>
      </div>

      <div
        className={`transition-all duration-500 ease-out ${state.phase === "imaged" ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0 max-xl:translate-x-0 max-xl:translate-y-4"}`}
      >
        <Image
          src={sampleImage}
          alt="The shared snippet as an image: useDebounce hook in TypeScript, by @sam, with its short link"
          preload
          className="h-auto w-full rounded-xl border border-[#1e1e2e] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
        />
      </div>
    </div>
  );
}
