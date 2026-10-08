import Navbar from "@/components/homepage/Navbar";
import HeroSection from "@/components/homepage/HeroSection";
import ShareFormatsSection from "@/components/homepage/ShareFormatsSection";
import SharedViewSection from "@/components/homepage/SharedViewSection";
import PreviewsSection from "@/components/homepage/PreviewsSection";
import McpSection from "@/components/homepage/McpSection";
import FeaturesSection from "@/components/homepage/FeaturesSection";
import PricingSection from "@/components/homepage/PricingSection";
import CTASection from "@/components/homepage/CTASection";
import Footer from "@/components/homepage/Footer";
import { isProEnabled } from "@/lib/plans";

export default function Home() {
  return (
    <main className="bg-[#0a0a0f] text-[#e4e4ef] overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ShareFormatsSection />
      <SharedViewSection />
      <PreviewsSection />
      <McpSection />
      <FeaturesSection />
      {isProEnabled() && <PricingSection />}
      <CTASection />
      <Footer />
    </main>
  );
}
