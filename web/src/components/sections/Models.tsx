import { CalibrationChart } from "@/components/charts/CalibrationChart";
import { MetricDots } from "@/components/charts/MetricDots";
import { RocChart } from "@/components/charts/RocChart";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { metrics, models, roc } from "@/lib/data";
import { int, pct } from "@/lib/format";

export function Models() {
  const cal = models.calibration[models.headline];
  const real = models.models.filter((m) => m.family !== "Baseline");
  const worst = real[real.length - 1];
  const best = real[0];

  return (
    <section id="models" className="border-t border-line pt-20 sm:pt-28">
      <SectionHeader index="01" kicker="Models" title="Seven models, one ceiling">
        <p>
          I compared a logistic regression, a random forest, a small neural net and two gradient-boosted tree
          libraries at near-default settings, then tuned the two boosters with a short random search. From best
          to worst, the whole field spans {metrics.auc_spread.toFixed(4)} AUC ({best.auc.toFixed(3)} for{" "}
          {best.name}, {worst.auc.toFixed(3)} for {worst.name}).
        </p>
        <p>
          When models this different land this close together, the limit is what the features can tell you, not
          the algorithm. Tuning bought a little. Better information about each shot would buy more.
        </p>
      </SectionHeader>

      <div className="mt-12 grid gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-12">
          <Card
            title={`Test set · ${int(metrics.dataset.test)} held-out shots`}
            note={`Each line starts at the naive baseline, which predicts ${pct(metrics.dataset.league_fg)} for every shot.`}
          >
            <MetricDots rows={models.models} headline={models.headline} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-6">
          <Card
            title="ROC curves"
            note="How many makes the model catches as it calls more shots makes. The six other models sit almost exactly under the orange line."
            className="h-full"
          >
            <RocChart data={roc} headline={models.headline} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-6" delay={0.05}>
          <Card
            title="Calibration"
            note="Test shots split into ten equal groups by predicted probability. On the diagonal, a 60% prediction goes in 60% of the time."
            className="h-full"
          >
            <CalibrationChart predicted={cal.predicted} actual={cal.actual} binSize={metrics.dataset.test / 10} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-12">
          <div className="grid gap-6 rounded-2xl border border-line p-6 sm:grid-cols-[180px_1fr] sm:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Why not accuracy?</p>
            <p className="max-w-3xl text-ink-2">
              With a 50% cutoff the model calls {pct(metrics.threshold.accuracy_at_0_5)} of test shots correctly,
              against {pct(metrics.naive.accuracy)} for calling every shot a miss. But a yes/no call throws away
              the useful part. A 48% look and a 22% look are both &ldquo;miss&rdquo;, and the gap between them is
              what shot quality means. So the model is judged on its probabilities (log loss, Brier, calibration),
              and the probability is what the rest of this page uses.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
