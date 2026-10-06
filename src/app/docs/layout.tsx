import Navbar from "@/components/homepage/Navbar";
import Footer from "@/components/homepage/Footer";
import DocsNav from "@/components/docs/docs-nav";
import { DOC_PAGES } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#e4e4ef]">
      <Navbar />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 pb-20 pt-24 lg:flex-row lg:gap-12">
        <DocsNav pages={DOC_PAGES.map(({ slug, title }) => ({ slug, title }))} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <Footer />
    </main>
  );
}
