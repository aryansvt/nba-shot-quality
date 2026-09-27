import { Predictor } from "@/components/charts/Predictor";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { context } from "@/lib/data";

export function PredictorSection() {
  return (
    <section id="predictor" className="border-t border-line pt-20 sm:pt-28">
      <SectionHeader index="04" kicker="Predictor" title="Price a shot">
        <p>
          Set up a shot and read off the model&apos;s make probability. There&apos;s no server here: every number
          comes from predictions made ahead of time across the five main inputs and shipped with the page.
        </p>
      </SectionHeader>
      <Reveal className="mt-12">
        <Predictor context={context} />
      </Reveal>
    </section>
  );
}
