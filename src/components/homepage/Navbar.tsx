"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a0f]/92 border-b border-white/10"
          : "bg-[#0a0a0f]/60 border-b border-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#e4e4ef]">
          <FolderOpen className="size-7" />
          DevStash
        </Link>

        <div className="hidden md:flex gap-8">
          <a href="/#features" className="text-sm font-medium text-[#8888a4] hover:text-[#e4e4ef] transition-colors">
            Features
          </a>
          <a href="/#pricing" className="text-sm font-medium text-[#8888a4] hover:text-[#e4e4ef] transition-colors">
            Pricing
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" asChild className="border-[#1e1e2e] text-[#8888a4] hover:text-[#e4e4ef] hover:border-[#8888a4] bg-transparent">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400 text-white border-0 hover:opacity-90">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>

        <button
          className="md:hidden text-[#e4e4ef] p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden flex flex-col gap-2 px-6 pb-6 border-t border-[#1e1e2e]">
          <a
            href="/#features"
            className="text-[#8888a4] text-sm py-2"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </a>
          <a
            href="/#pricing"
            className="text-[#8888a4] text-sm py-2"
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </a>
          <Button variant="outline" asChild className="border-[#1e1e2e] text-[#8888a4] hover:text-[#e4e4ef] bg-transparent mt-1 justify-center">
            <Link href="/sign-in" onClick={() => setMobileOpen(false)}>Sign In</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400 text-white border-0 justify-center">
            <Link href="/register" onClick={() => setMobileOpen(false)}>Get Started</Link>
          </Button>
        </div>
      )}
    </nav>
  );
}
