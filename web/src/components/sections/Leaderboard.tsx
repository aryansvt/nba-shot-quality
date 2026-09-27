import { PlayerExplorer } from "@/components/charts/PlayerExplorer";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { metrics, players } from "@/lib/data";
import { int, pct, pts } from "@/lib/format";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => WORDS[n] ?? String(n);

export function Leaderboard() {
  const list = players.players;
  const top = list[0];
  const beyond = list.filter((p) => Math.abs(p.diff) > 1.96 * p.se).length;
  const byChance = Math.round(list.length * 0.05);
  const folds = players.cv_folds;

  const caveats = [
    {
      title: "Most of the middle is noise",
      body: `The whiskers show what luck alone does over a player's shot count. ${beyond} of ${list.length} players land outside them, against about ${byChance} you'd expect by chance. So the ends of the list carry real signal, but most of the middle sits inside the noise band.`,
    },
    {
      title: "It measures making shots, not getting them",
      body: "Expected FG% is built from each player's own attempts, so someone who creates easy looks is judged against an easy baseline. Shot creation is a separate skill this list doesn't credit.",
    },
    {
      title: "The model can't see shot type",
      body: "A dunk and a contested hook from 3 ft look alike to it. That is part of why centers show up at both ends of the list.",
    },
  ];

  return (
    <section id="players" className="border-t border-line pt-20 sm:pt-28">
      <SectionHeader index="03" kicker="Shot-making" title="Who made more than they should have">
        <p>
          A second LightGBM model is trained without knowing who took the shot. Its prediction is what an average
          player would make from the same distance, spacing and clock. Actual FG% minus that expected FG% is
          shot-making, the same idea as expected goals in soccer.
        </p>
        <p>
          Every expected value is out-of-sample. The shots are split into {word(folds)} groups, and each group is
          scored by a model trained on the other {word(folds - 1)}. Without knowing who shot, that model still
          reaches an AUC of {players.situation.auc.toFixed(3)}, about the same as the main model&apos;s{" "}
          {metrics.headline.auc.toFixed(3)}.
        </p>
        <p>
          {top.name} leads: {pct(top.actual)} on shots worth {pct(top.expected)} for an average player,{" "}
          {pts(top.diff)} points over {int(top.shots)} attempts.
        </p>
      </SectionHeader>

      <div className="mt-12">
        <Reveal>
          <PlayerExplorer players={list} />
        </Reveal>
        <Reveal className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-line bg-[var(--line)] md:grid-cols-3">
          {caveats.map((c) => (
            <div key={c.title} className="bg-bg p-6">
              <h3 className="font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{c.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
