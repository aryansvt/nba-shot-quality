import { Nav } from "@/components/Nav";
import { Explain } from "@/components/sections/Explain";
import { Hero } from "@/components/sections/Hero";
import { Models } from "@/components/sections/Models";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1200px] space-y-24 px-4 sm:space-y-32 sm:px-8">
        <Hero />
        <Models />
        <Explain />
      </main>
    </>
  );
}
