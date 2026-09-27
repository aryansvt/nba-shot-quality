import { Nav } from "@/components/Nav";
import { Explain } from "@/components/sections/Explain";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Leaderboard } from "@/components/sections/Leaderboard";
import { Methodology } from "@/components/sections/Methodology";
import { Models } from "@/components/sections/Models";
import { PredictorSection } from "@/components/sections/PredictorSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1200px] space-y-24 px-4 sm:space-y-32 sm:px-8">
        <Hero />
        <Models />
        <Explain />
        <Leaderboard />
        <PredictorSection />
        <Methodology />
      </main>
      <Footer />
    </>
  );
}
