import Link from "next/link";
import { Button } from "@/components/ui/button";
import ShareDemo from "./ShareDemo";

export default function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-[120px] pb-20 max-md:px-5 max-md:pt-[100px] max-md:pb-[60px] text-center bg-[#0a0a0f] bg-[radial-gradient(ellipse_60%_45%_at_50%_25%,rgba(59,130,246,0.16),transparent_70%)]">
      <div className="max-w-[720px] mb-14">
        <h1 className="text-[clamp(2.6rem,6vw,4.4rem)] font-extrabold leading-[1.05] mb-6 tracking-tight max-sm:text-[2.4rem]">
          Stash it.
          <br />
          <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 bg-clip-text text-transparent">
            Share it.
          </span>
        </h1>
        <p className="text-lg text-[#8888a4] max-w-[600px] mx-auto mb-8 leading-relaxed text-balance max-sm:text-base">
          Keep your snippets, commands, and prompts in one private stash. Share any of them with a
          short link, a raw URL for curl, or a clean image.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg" variant="brand" className="px-8 py-3 text-base hover:-translate-y-0.5 transition-all">
            <Link href="/register">Start sharing free</Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="border-[#1e1e2e] text-[#8888a4] hover:text-[#e4e4ef] hover:border-[#8888a4] bg-transparent px-8 py-3 text-base">
            <a href="#sharing">See how it works</a>
          </Button>
        </div>
      </div>
      <ShareDemo />
    </section>
  );
}
