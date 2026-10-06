"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DocsNavProps {
  pages: { slug: string; title: string }[];
}

export default function DocsNav({ pages }: DocsNavProps) {
  const pathname = usePathname();
  const links = [
    { href: "/docs", title: "Overview" },
    ...pages.map((page) => ({ href: `/docs/${page.slug}`, title: page.title })),
  ];

  return (
    <nav aria-label="Docs" className="shrink-0 lg:sticky lg:top-24 lg:w-56 lg:self-start">
      <p className="mb-3 font-mono text-xs uppercase tracking-wider text-[#8888a4]">Docs</p>
      <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-[#e4e4ef]"
                    : "border border-white/10 text-[#8888a4] hover:text-[#e4e4ef] lg:border-transparent"
                }`}
              >
                {link.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
