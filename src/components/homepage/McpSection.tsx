import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SETUP_KINDS, setupSnippet } from "@/lib/api/setup-snippets";
import { MCP_DOCS_PATH } from "@/lib/constants/links";
import { languageLabel } from "@/lib/languages";
import { publicShortPath } from "@/lib/public/paths";
import AgentSetupTabs, { type AgentSetup } from "./AgentSetupTabs";
import ScrollFadeIn from "./ScrollFadeIn";
import { DISPLAY_ORIGIN, SAMPLE_COLLECTION, SAMPLE_ITEM } from "./samples";

const ORIGIN = `https://${DISPLAY_ORIGIN}`;
const PLACEHOLDER_TOKEN = "ds_your_token";

function agentSetups(): AgentSetup[] {
  return SETUP_KINDS.filter((kind) => kind.value !== "curl").map((kind) => ({
    key: kind.value,
    label: kind.label,
    hint: kind.hint,
    snippet: setupSnippet(kind.value, ORIGIN, PLACEHOLDER_TOKEN),
  }));
}

function Ask({ children }: { children: string }) {
  return (
    <p className="text-[#e4e4ef]">
      <span className="text-[#10b981]" aria-hidden="true">
        &gt;{" "}
      </span>
      {children}
    </p>
  );
}

function ToolCall({ tool, detail }: { tool: string; detail: string }) {
  return (
    <p className="text-[#8888a4]">
      <span className="text-[#8b5cf6]" aria-hidden="true">
        ●{" "}
      </span>
      devstash <span className="text-[#e4e4ef]">{tool}</span> {detail}
    </p>
  );
}

function AgentTranscript() {
  const link = `${ORIGIN}${publicShortPath(SAMPLE_ITEM.shortId)}`;
  const found = SAMPLE_COLLECTION.items.map((item) => item.title).join(", ");

  return (
    <div className="overflow-hidden rounded-xl border border-[#262636] bg-[#15151e] text-left">
      <div className="border-b border-[#262636] bg-[#1c1c27] px-4 py-2.5 font-mono text-xs text-[#8888a4]">Terminal</div>
      <div className="space-y-2 break-words p-5 font-mono text-[13px] leading-relaxed text-[#c8c8d8]">
        <Ask>Save this hook to DevStash and give me a share link</Ask>
        <ToolCall tool="save_item" detail={`${SAMPLE_ITEM.title}, ${languageLabel(SAMPLE_ITEM.language)}`} />
        <ToolCall tool="share_item" detail="unlisted" />
        <p className="pb-4">
          Saved and shared: <span className="break-all text-[#4ea1f3]">{link}</span>
        </p>
        <Ask>Find my Docker notes in DevStash</Ask>
        <ToolCall tool="search_items" detail={'"docker"'} />
        <p>
          Found {SAMPLE_COLLECTION.items.length}: {found}
        </p>
      </div>
    </div>
  );
}

export default function McpSection() {
  return (
    <section id="mcp" className="relative overflow-hidden py-[120px] bg-[#0a0a0f] border-t border-[#1e1e2e] scroll-mt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_30%_50%,rgba(139,92,246,0.16),transparent_70%)] max-lg:bg-[radial-gradient(ellipse_70%_30%_at_50%_45%,rgba(139,92,246,0.16),transparent_70%)]"
      />
      <div className="relative max-w-[1200px] mx-auto px-6">
        <ScrollFadeIn className="text-center">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            Use it from your AI tools
          </h2>
          <p className="text-base text-[#8888a4] max-w-[600px] mx-auto mb-14 leading-relaxed">
            DevStash runs an MCP server, so Claude Code, Codex, and Cursor can search your stash, save
            what you are working on, and hand back a share link without leaving the editor.
          </p>
        </ScrollFadeIn>

        <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-12 max-lg:grid-cols-1">
          <AgentTranscript />

          <div className="space-y-5">
            <h3 className="text-2xl font-bold tracking-tight text-[#e4e4ef]">One line to connect</h3>
            <p className="leading-relaxed text-[#8888a4]">
              Nothing to install. Create a token on the settings page, then add the server to your
              agent. Any MCP client that supports Streamable HTTP and can send a header works too.
            </p>
            <AgentSetupTabs setups={agentSetups()} />
            <Button asChild variant="brand">
              <Link href={MCP_DOCS_PATH}>Connect your agent</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
