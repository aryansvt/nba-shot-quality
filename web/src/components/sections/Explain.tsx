import { DefenderParadox } from "@/components/charts/DefenderParadox";
import { DependencePlot } from "@/components/charts/DependencePlot";
import { ImportanceBars } from "@/components/charts/ImportanceBars";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { context, shap } from "@/lib/data";
import { int, pct } from "@/lib/format";

export function Explain() {
  const { defender } = context;
  const tight = defender.bands[0];
  const open = defender.bands[defender.bands.length - 1];
  const rim = defender.by_distance[0].cells;
  const shooterRank = shap.importance.findIndex((f) => f.feature === "player_id_FG_ENC") + 1;

  return (
    <section id="explain" className="border-t border-line pt-20 sm:pt-28">
      <SectionHeader index="02" kicker="Explainability" title="What the model pays attention to">
        <p>
          SHAP splits every prediction into pushes from each feature, toward a make or toward a miss. Averaged
          over {int(shap.n)} test shots, spacing and distance do most of the work. Who took the shot ranks{" "}
          {ordinal(shooterRank)}: once the model knows the situation, the shooter&apos;s own FG% adds little.
        </p>
        <p className="text-[15px] text-ink-3">
          Units are log-odds. Near a 45% shot, +0.1 is worth about 2.5 percentage points.
        </p>
      </SectionHeader>

      <div className="mt-12 grid gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <Card title="Feature importance" note="Mean absolute SHAP value, tuned LightGBM" className="h-full">
            <ImportanceBars items={shap.importance} />
          </Card>
        </Reveal>
        <Reveal className="lg:col-span-7" delay={0.05}>
          <Card title="How each top feature pushes" note="Each dot is one test shot. The orange line is the average push at that value.">
            <DependencePlot data={shap.dependence} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-12">
          <Card>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">The defender paradox</p>
                <h3 className="mt-3 font-display text-3xl font-semibold uppercase leading-none text-ink">
                  Open shots aren&apos;t easy shots
                </h3>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-2">
                  <p>
                    Across all shots, defender distance barely correlates with a make (r = {defender.corr.toFixed(3)}).
                    Guarded within 2 ft, shots went in {pct(tight.fg)} of the time. With nobody within 6 ft,{" "}
                    {pct(open.fg)}.
                  </p>
                  <p>
                    Split by distance and the effect is obvious. At the rim, FG% climbs from {pct(rim[0].fg, 0)} to{" "}
                    {pct(rim[rim.length - 1].fg, 0)} as the defender backs off. It hides in the total because open
                    looks are mostly long ones: {pct(open.share_threes, 0)} of wide-open shots were threes, against{" "}
                    {pct(tight.share_threes, 0)} of tightly guarded ones.
                  </p>
                  <p>
                    That is why the engineered ratio, defender distance over shot distance, ranks first. It
                    measures openness relative to how hard the shot already is.
                  </p>
                </div>
              </div>
              <DefenderParadox defender={defender} />
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function ordinal(n: number) {
  const words = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  return words[n] ?? `${n}th`;
}
