import { Code, Download, FolderOpen, Lock, Search, Sparkles } from "lucide-react";
import { isProEnabled } from "@/lib/plans";
import ScrollFadeIn from "./ScrollFadeIn";

const FEATURES = [
  {
    icon: Lock,
    title: "Private by default",
    description:
      "Everything you save is yours alone until you choose to share it. Change who can see an item or a collection any time.",
    accent: "#10b981",
  },
  {
    icon: Search,
    title: "Instant search",
    description:
      "Cmd+K finds any snippet, prompt, command, or note by its title or content.",
    accent: "#06b6d4",
  },
  {
    icon: FolderOpen,
    title: "Collections",
    description:
      "Group items by project or topic. Keep a collection private, or publish it as one ordered page.",
    accent: "#6366f1",
  },
  {
    icon: Code,
    title: "Every kind of snippet",
    description: "Snippets, prompts, commands, notes, and links, highlighted in 30 languages.",
    proDescription:
      "Snippets, prompts, commands, notes, and links, highlighted in 30 languages. Files and images on Pro.",
    accent: "#3b82f6",
  },
  {
    icon: Sparkles,
    title: "AI helpers",
    description:
      "Suggested tags, plain-English explanations of code, and a prompt optimizer that rewrites your prompts.",
    accent: "#f59e0b",
    pro: true,
  },
  {
    icon: Download,
    title: "Export anytime",
    description: "Download everything as markdown or JSON whenever you want.",
    proDescription:
      "Download everything as markdown or JSON on any plan, or as a ZIP with your files on Pro.",
    accent: "#64748b",
  },
];

export default function FeaturesSection() {
  const proEnabled = isProEnabled();

  return (
    <section id="features" className="py-[120px] text-center bg-[#12121a]">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollFadeIn>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            Everything you share starts in your stash
          </h2>
        </ScrollFadeIn>
        <ScrollFadeIn>
          <p className="text-base text-[#8888a4] max-w-[520px] mx-auto mb-16 leading-relaxed">
            Save it privately first, find it in a keystroke, and share it only when you choose.
          </p>
        </ScrollFadeIn>

        <div className="grid grid-cols-3 gap-x-6 gap-y-10 max-lg:grid-cols-2 max-md:grid-cols-1">
          {FEATURES.map((f) => (
            <ScrollFadeIn key={f.title}>
              <div
                className="bg-[#12121a] border border-[#1e1e2e] rounded-xl px-6 py-5 text-left transition-all duration-300 hover:-translate-y-1 group"
                style={{ "--feature-accent": f.accent } as React.CSSProperties}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-5"
                  style={{
                    background: `color-mix(in srgb, ${f.accent} 15%, transparent)`,
                    color: f.accent,
                  }}
                >
                  <f.icon className="size-6" />
                </div>
                <h3 className="flex items-center gap-2 text-lg font-bold mb-2 text-[#e4e4ef]">
                  {f.title}
                  {proEnabled && f.pro && (
                    <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-black">
                      Pro
                    </span>
                  )}
                </h3>
                <p className="text-sm text-[#8888a4] leading-relaxed">
                  {proEnabled && f.proDescription ? f.proDescription : f.description}
                </p>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
