import { AuthDialogProvider } from "@/components/landing/shared/auth-dialog-provider";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { TrustSection } from "@/components/landing/trust-section";
import { ProductStory } from "@/components/landing/product-story";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { ScrollStory } from "@/components/landing/scroll-story";
import { CommandCenter } from "@/components/landing/command-center";
import { Testimonials } from "@/components/landing/testimonials";
import { PricingPreview } from "@/components/landing/pricing-preview";
import { FinalCTA } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="landing-page dark relative min-h-dvh overflow-x-clip bg-background text-foreground">
      <AuthDialogProvider>
        <LandingNav />
        <main>
          <Hero />
          <TrustSection />
          <ProductStory />
          <FeatureShowcase />
          <InteractiveDemo />
          <ScrollStory />
          <CommandCenter />
          <Testimonials />
          <PricingPreview />
          <FinalCTA />
        </main>
        <LandingFooter />
      </AuthDialogProvider>
    </div>
  );
}
