import { Suspense } from "react";
import Hero, { HeroSkeleton } from "@/components/home/Hero";
import TopSelections, { PicksSkeleton } from "@/components/home/TopSelections";
import Features from "@/components/home/Features";
import Methodology from "@/components/home/Methodology";
import ChatTeaser from "@/components/home/ChatTeaser";
import Transparency, { TransparencySkeleton } from "@/components/home/Transparency";
import Pricing from "@/components/home/Pricing";
import Faq from "@/components/home/Faq";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<PicksSkeleton />}>
        <TopSelections />
      </Suspense>
      <Features />
      <Methodology />
      <ChatTeaser />
      <Suspense fallback={<TransparencySkeleton />}>
        <Transparency />
      </Suspense>
      <Pricing />
      <Faq />
    </>
  );
}
