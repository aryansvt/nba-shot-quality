import { CourtBands } from "@/components/charts/CourtBands";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import { context, metrics } from "@/lib/data";
import { int, pct } from "@/lib/format";
import { NOTEBOOK_URL } from "@/lib/site";

export function Hero() {
  const { dataset, headline, naive } = metrics;

  const stats = [
    {
      label: "AUC, held-out shots",
      value: <CountUp value={headline.auc} format="fixed3" />,
      sub: `${naive.auc.toFixed(3)} is a coin flip`,
    },
    {
      label: "Log loss",
      value: <CountUp value={headline.log_loss} format="fixed3" />,
      sub: `${pct(metrics.log_loss_gain)} better than always guessing ${pct(dataset.league_fg, 0)}`,
    },
    {
      label: "Brier score",
      value: <CountUp value={headline.brier} format="fixed3" />,
      sub: `vs ${naive.brier.toFixed(3)} for the same flat guess`,
    },
    {
      label: "League FG%",
      value: <CountUp value={dataset.league_fg} format="pct1" />,
      sub: `${int(dataset.made)} of ${int(dataset.shots)} went in`,
    },
  ];

  return (
    <section id="top" className="relative pt-28 sm:pt-36">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
              <span className="text-accent">●</span>&nbsp; {dataset.season} NBA · SportVU tracking · {int(dataset.shots)} shots
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 font-display text-[clamp(3.4rem,9vw,7.25rem)] font-bold uppercase leading-[0.86] tracking-[-0.015em] text-ink">
              How good
              <br />
              was that <span className="text-accent">shot?</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-2">
              A model that puts a make probability on {int(dataset.shots)} tracked shots from the {dataset.season}{" "}
              NBA season, using what the cameras saw: how far out the shooter was, how close the nearest defender
              got, the shot clock, and how long the ball was held.
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">
              It works, within limits. The best model reaches an AUC of {headline.auc.toFixed(2)}: clearly better
              than guessing, far from certain. A lot of what decides a shot, like the shooter&apos;s touch,
              the quality of the contest, and plain luck, isn&apos;t in this data.
            </p>
          </Reveal>
          <Reveal delay={0.18} className="mt-9 flex flex-wrap gap-3">
            <a
              href="#predictor"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#160a04] transition-transform hover:-translate-y-0.5"
            >
              Price a shot
            </a>
            <a
              href={NOTEBOOK_URL}
              className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
            >
              Read the notebook ↗
            </a>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="rounded-2xl border border-line bg-surface/70 p-5 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">FG% by distance</h2>
            <span className="font-mono text-[11px] text-ink-3">all {int(dataset.shots)} shots</span>
          </div>
          <CourtBands zones={context.zones} league={context.league_fg} />
        </Reveal>
      </div>

      <dl className="mt-16 grid grid-cols-2 border-y border-line lg:mt-20 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal
            key={s.label}
            delay={0.05 * i}
            className={
              [
                "py-6 pr-4",
                i === 0 && "pl-0",
                i % 2 === 1 && "border-l border-line pl-4 sm:pl-6",
                i === 2 && "border-t border-line pl-0 lg:border-l lg:border-t-0 lg:pl-6",
                i === 3 && "border-t lg:border-t-0",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">{s.label}</dt>
            <dd className="mt-2 font-display text-[clamp(2.6rem,5vw,3.6rem)] font-semibold leading-none text-ink">
              {s.value}
            </dd>
            <dd className="mt-2 text-sm text-ink-3">{s.sub}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
