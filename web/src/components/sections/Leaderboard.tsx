import { PlayerExplorer } from "@/components/charts/PlayerExplorer";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { players } from "@/lib/data";
import { int, pct, pts } from "@/lib/format";

export function Leaderboard() {
  const list = players.players;
  const top = list[0];
  const beyond = list.filter((p) => Math.abs(p.diff) > 1.96 * p.se).length;
  const byChance = Math.round(list.length * 0.05);

  const caveats = [
    {
      title: "Most of the middle is noise",
      body: `The whiskers show what luck alone does over a player's shot count. ${beyond} of ${list.length} players land outside them, against about ${byChance} you'd expect by chance. So the ends of the list carry real signal, but most of the middle sits inside the noise band.`,
    },
    {
      title: "Expected values are partly in-sample",
      body: `As in the notebook, train and test predictions are pooled for bigger samples, so ${pct(players.in_sample_share, 0)} of shots were scored by the model that learned from them. That can pull expected FG% toward the actual results.`,
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
