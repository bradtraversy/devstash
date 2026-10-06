import Link from "next/link";
import { Button } from "@/components/ui/button";
import ScrollFadeIn from "./ScrollFadeIn";

export default function CTASection() {
  return (
    <section className="py-[120px] text-center bg-[#0a0a0f] bg-[radial-gradient(ellipse_50%_70%_at_50%_50%,rgba(59,130,246,0.09),transparent_70%)]">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollFadeIn>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            Your next snippet deserves a link
          </h2>
          <p className="text-base text-[#8888a4] max-w-[520px] mx-auto mb-8 leading-relaxed">
            Free to use, with sharing built in. Paste something and send the link.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400 text-white border-0 px-8 py-3 text-base hover:opacity-90 hover:-translate-y-0.5 transition-all">
            <Link href="/register">Start sharing free</Link>
          </Button>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
