import type { BayPollStats } from "../../../lib/bay-space-polls";

export default function ProfilePollScoreCard({ stats }: { stats: BayPollStats }) {
  const rows = [
    ["Polls voted", stats.voted],
    ["Outcomes won", stats.won],
    ["Outcomes lost", stats.lost],
    ["Ties / refunds", stats.refunded],
    ["Accuracy", `${stats.accuracy}%`],
    ["Poll points won", stats.pointsWon],
    ["Poll points lost", stats.pointsLost],
    ["Net Poll score", stats.netPoints],
    ["Winning streak", stats.currentStreak],
    ["Polls authored", stats.authored],
  ];

  return (
    <section className="mt-8 rounded-[1.8rem] border border-[#72c16a]/35 bg-[radial-gradient(circle_at_top_left,rgba(114,193,106,0.12),transparent_42%),rgba(0,0,0,0.76)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.32)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-[#8eaa8a]">separate public record</p>
          <h2 className="mt-2 text-lg font-black uppercase tracking-[0.18em] text-[#cde0ca]">Polls + score</h2>
        </div>
        <span className="rounded-full border border-[#72c16a]/30 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#9abc96]">Poll outcomes only</span>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#72c16a]/20 bg-black/35 px-4 py-3">
            <dt className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[#789274]">{label}</dt>
            <dd className="mt-2 text-lg font-black text-[#cde0ca]">
              {typeof value === "number" ? value.toLocaleString("en-US") : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
