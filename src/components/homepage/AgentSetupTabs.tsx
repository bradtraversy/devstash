"use client";

import { useTabList } from "@/hooks/use-tab-list";

export interface AgentSetup {
  key: string;
  label: string;
  hint: string;
  snippet: string;
}

export default function AgentSetupTabs({ setups }: { setups: AgentSetup[] }) {
  const { selected, setSelected, onKeyDown, tabRef } = useTabList(setups.length);

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Agent setup" className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
        {setups.map((setup, index) => {
          const active = index === selected;
          return (
            <button
              key={setup.key}
              ref={tabRef(index)}
              type="button"
              role="tab"
              id={`agent-tab-${setup.key}`}
              aria-selected={active}
              aria-controls={`agent-panel-${setup.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(index)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10b981] ${
                active
                  ? "border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]"
                  : "border-[#1e1e2e] text-[#8888a4] hover:border-[#8888a4] hover:text-[#e4e4ef]"
              }`}
            >
              {setup.label}
            </button>
          );
        })}
      </div>

      {setups.map((setup, index) => (
        <div
          key={setup.key}
          role="tabpanel"
          id={`agent-panel-${setup.key}`}
          aria-labelledby={`agent-tab-${setup.key}`}
          tabIndex={0}
          hidden={index !== selected}
          className="space-y-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10b981]"
        >
          <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4 font-mono text-[13px] leading-relaxed text-[#c8c8d8]">
            {setup.snippet}
          </pre>
          <p className="text-sm text-[#8888a4]">{setup.hint}</p>
        </div>
      ))}
    </div>
  );
}
