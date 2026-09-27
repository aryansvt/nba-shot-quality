import { PcaScatter } from "@/components/charts/PcaScatter";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { context, metrics } from "@/lib/data";
import { int, pct } from "@/lib/format";
import { DATASET_URL, EXPORT_URL, NOTEBOOK_URL } from "@/lib/site";

export function Methodology() {
  const d = metrics.dataset;
  const steps = [
    {
      title: "Data",
      body: (
        <>
          {int(d.shots)} shots from {int(d.games)} games, October 2014 to early March 2015, from the{" "}
          <a className="link" href={DATASET_URL}>
            Kaggle NBA shot logs
          </a>{" "}
          (SportVU tracking via NBA.com). Each row has shot distance, closest defender and their distance, shot
          clock, dribbles, touch time, and the result.
        </>
      ),
    },
    {
      title: "Cleaning",
      body: (
        <>
          Game clock parsed to seconds. 5,567 missing shot clocks are flagged, then filled with the game clock
          (capped at 24), since the shot clock switches off late in periods. 312 negative touch times, a sensor
          glitch, are clipped to zero.
        </>
      ),
    },
    {
      title: "Features",
      body: (
        <>
          {d.features} inputs: the raw tracking values, log dribbles and touch time, six distance zones, flags for
          catch-and-shoot, late clock (4 s or less), open (6+ ft), shot clock off, home and buzzer beaters, and defender distance
          divided by shot distance plus one.
        </>
      ),
    },
    {
      title: "No leakage",
      body: (
        <>
          Shooter and defender IDs become smoothed FG% values,{" "}
          <span className="whitespace-nowrap font-mono text-[13px] text-ink">(n·mean + 50·league) / (n + 50)</span>,
          computed out-of-fold on the training set so no shot ever sees its own result.
        </>
      ),
    },
    {
      title: "Training",
      body: (
        <>
          Stratified 80/20 split ({int(d.train)} / {int(d.test)}). Five model families at near-default settings,
          then a six-config random search for XGBoost and LightGBM, scored on 3-fold cross-validated log loss.
        </>
      ),
    },
    {
      title: "Scoring",
      body: (
        <>
          Log loss and Brier score first, since the output is a probability. AUC for ranking, calibration curves to
          check the probabilities mean what they say. Accuracy is reported but isn&apos;t the target.
        </>
      ),
    },
  ];

  const limits = [
    `AUC ${metrics.headline.auc.toFixed(2)} is modest. The model sorts good looks from bad ones, but any single shot is still close to a coin flip.`,
    "No shot location beyond distance, no shot type, no play type, no help defense, no fatigue beyond the period and game clock.",
    "One partial season, 2014-15. The league has moved further toward threes and rim attempts since.",
    "Closest defender is measured at the moment of the shot. A late closeout and a defender who never left look the same.",
  ];

  return (
    <section id="method" className="border-t border-line pt-20 sm:pt-28">
      <SectionHeader index="05" kicker="Methodology" title="How it was built">
        <p>
          The notebook is the full record: data cleaning, EDA, PCA and t-SNE, five baselines, tuning, SHAP, and
          the player analysis. A Python package reproduces it, and one export script writes every number on this
          page. One deliberate change: the notebook scored most leaderboard shots in-sample, while this page uses
          out-of-fold predictions. Player numbers moved by about a tenth of a point on average.
        </p>
      </SectionHeader>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={(i % 3) * 0.05} className="bg-bg p-6 sm:p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
              <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>&nbsp; {s.title}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-5">
        <div className="grid gap-8 rounded-2xl border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[1fr_minmax(0,420px)]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Limits</p>
            <h3 className="mt-3 font-display text-3xl font-semibold uppercase leading-none text-ink">
              Shot quality is noisy
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              Project the shots onto their first two principal components (together {pct(context.pca.explained[0] + context.pca.explained[1], 0)} of
              the variance) and made and missed shots overlap almost everywhere. Some regions lean one way, since
              close shots go in more often, but there is no boundary to find. The data groups shots by type and
              situation, not by outcome. That is the ceiling every model on this page runs into.
            </p>
            <ul className="mt-5 space-y-2.5 text-[15px] leading-relaxed text-ink-2">
              {limits.map((l) => (
                <li key={l} className="grid grid-cols-[14px_1fr] gap-2">
                  <span className="mt-[11px] h-px w-2.5 bg-ink-3" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <PcaScatter points={context.pca.points} />
            <p className="mt-2 text-xs text-ink-3">2,000 random shots, PC1 vs PC2, standardized tracking features.</p>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-5">
        <div className="grid gap-6 rounded-2xl border border-line p-6 sm:p-8 lg:grid-cols-[1fr_minmax(0,520px)] lg:items-center">
          <div>
            <h3 className="font-semibold text-ink">Reproduce it</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              The export trains everything once in about 30 seconds and checks each metric against the notebook.
              Library versions are pinned. See the{" "}
              <a className="link" href={NOTEBOOK_URL}>
                notebook
              </a>{" "}
              and the{" "}
              <a className="link" href={EXPORT_URL}>
                export script
              </a>
              .
            </p>
          </div>
          <pre className="scroll-thin overflow-x-auto rounded-xl border border-line bg-[#07090d] p-4 font-mono text-[12.5px] leading-relaxed text-ink-2">
            <code>
              <span className="text-ink-3">$</span> pip install -r requirements.txt{"\n"}
              <span className="text-ink-3">$</span> python scripts/export_site_data.py{"\n"}
              <span className="text-ink-3">$</span> cd web &amp;&amp; npm install &amp;&amp; npm run build
            </code>
          </pre>
        </div>
      </Reveal>
    </section>
  );
}
