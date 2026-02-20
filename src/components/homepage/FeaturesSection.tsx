import { Code, Sparkles, Search, Terminal, FileText, FolderOpen } from "lucide-react";
import ScrollFadeIn from "./ScrollFadeIn";

const FEATURES = [
  {
    icon: Code,
    title: "Code Snippets",
    description:
      "Save reusable code with syntax highlighting, language detection, and instant copy. Never rewrite the same function twice.",
    accent: "#3b82f6",
  },
  {
    icon: Sparkles,
    title: "AI Prompts",
    description:
      "Store and organize your best prompts for ChatGPT, Claude, and other AI tools. Build a personal prompt library.",
    accent: "#f59e0b",
  },
  {
    icon: Search,
    title: "Instant Search",
    description:
      "Find anything in milliseconds. Search across all your items by content, tags, titles, or type with Cmd+K.",
    accent: "#06b6d4",
  },
  {
    icon: Terminal,
    title: "Commands",
    description:
      "Keep your most-used terminal commands at your fingertips. No more digging through bash history.",
    accent: "#22c55e",
  },
  {
    icon: FileText,
    title: "Files & Docs",
    description:
      "Upload and manage files, images, and documents. Keep your project assets organized alongside your code.",
    accent: "#64748b",
  },
  {
    icon: FolderOpen,
    title: "Collections",
    description:
      "Group related items into collections. Organize by project, topic, or workflow for quick access.",
    accent: "#6366f1",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-[120px] text-center bg-[#12121a]">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollFadeIn>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            Everything You Need,
            <br />
            <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 bg-clip-text text-transparent">
              One Place
            </span>
          </h2>
        </ScrollFadeIn>
        <ScrollFadeIn>
          <p className="text-base text-[#8888a4] max-w-[520px] mx-auto mb-16 leading-relaxed">
            Stop context-switching between tools. DevStash keeps all your developer resources
            organized and searchable.
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
                <h3 className="text-lg font-bold mb-2 text-[#e4e4ef]">{f.title}</h3>
                <p className="text-sm text-[#8888a4] leading-relaxed">{f.description}</p>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
