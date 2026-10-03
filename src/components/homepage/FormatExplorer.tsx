"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface LinkFormat {
  key: string;
  label: string;
  suffix: string;
  caption: string;
  panel: ReactNode;
}

interface FormatExplorerProps {
  origin: string;
  prefix: string;
  shortId: string;
  formats: LinkFormat[];
}

/** The short link with a switchable ending; each ending shows what that URL returns. */
export default function FormatExplorer({ origin, prefix, shortId, formats }: FormatExplorerProps) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = formats[selected];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = (selected + step + formats.length) % formats.length;
    setSelected(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <p className="mb-6 break-all font-[family-name:var(--font-geist-mono)] text-[clamp(1.35rem,4vw,2.6rem)] leading-tight tracking-tight">
        <span className="text-[#55556a]">{origin}</span>
        <span className="text-[#8888a4]">{prefix}</span>
        <span className="text-[#e4e4ef]">{shortId}</span>
        <span className="text-[#10b981] underline decoration-[#10b981]/40 decoration-2 underline-offset-[6px]">
          {current.suffix}
        </span>
      </p>

      <div role="tablist" aria-label="Link formats" className="mb-3 flex flex-wrap justify-center gap-2" onKeyDown={onKeyDown}>
        {formats.map((format, index) => {
          const active = index === selected;
          return (
            <button
              key={format.key}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`format-tab-${format.key}`}
              aria-selected={active}
              aria-controls={`format-panel-${format.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(index)}
              className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10b981] ${
                active
                  ? "border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]"
                  : "border-[#1e1e2e] text-[#8888a4] hover:border-[#8888a4] hover:text-[#e4e4ef]"
              }`}
            >
              {format.label}
            </button>
          );
        })}
      </div>
      <p className="mb-8 text-sm text-[#8888a4]">{current.caption}</p>

      <div className="min-h-[470px] text-left max-md:min-h-0">
        {formats.map((format, index) => (
          <div
            key={format.key}
            role="tabpanel"
            id={`format-panel-${format.key}`}
            aria-labelledby={`format-tab-${format.key}`}
            tabIndex={0}
            hidden={index !== selected}
            className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10b981]"
          >
            {format.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
