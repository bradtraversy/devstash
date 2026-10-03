import { FolderOpen } from "lucide-react";
import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-[#1e1e2e] pt-16 pb-8 bg-[#0a0a0f]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12 max-md:grid-cols-2 max-md:gap-8 max-sm:grid-cols-1">
          {/* Brand */}
          <div className="max-md:col-span-2 max-sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#e4e4ef] mb-3">
              <FolderOpen className="size-6" />
              DevStash
            </Link>
            <p className="text-sm text-[#8888a4] max-w-[280px] leading-relaxed">
              Your snippets, commands, and prompts in one private stash, each one a link away from sharing.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#e4e4ef] mb-1">
                {title}
              </h4>
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-[#8888a4] hover:text-[#e4e4ef] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-[#1e1e2e] pt-6 text-center">
          <p className="text-sm text-[#55556a]">
            &copy; {new Date().getFullYear()} DevStash. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
