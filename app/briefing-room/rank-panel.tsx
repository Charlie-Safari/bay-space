import {
  cryptiRanks,
  getBayRankConfig,
  getCryptiRankConfig,
  getNextBayPointRank,
  getNextPromotionProgress,
  graduationTokenCost,
  oracleBadgeTokenCost,
} from "../../lib/bay-space-ranks";
import {
  getParticipationChecklist,
  participationLabels,
  type RankParticipation,
} from "../../lib/bay-space-promotion";
import type { BayMember } from "../../lib/bay-space-types";

type RankMember = Partial<Pick<BayMember, "rank" | "cryptiRank" | "gateKeys" | "lifetimePoints" | "bayoTokens">> & {
  rankParticipation?: RankParticipation;
};

type ProgressRow = {
  label: string;
  total?: number;
  currentTarget?: number;
  nextTarget?: number;
  currentMet?: boolean;
};

const format = new Intl.NumberFormat("en-US");

function Target({ total, target, met, next }: {
  total?: number;
  target?: number;
  met?: boolean;
  next?: boolean;
}) {
  if (target === undefined) {
    return <span className="text-[#9bb096]" aria-label="No target">—</span>;
  }

  const fulfilled = met ?? (total === undefined ? undefined : total >= target);
  const label = fulfilled === undefined ? "Unavailable"
    : fulfilled ? "Met"
    : next && total !== undefined ? `${format.format(target - total)} left`
    : "Below target";

  return (
    <>
      <span className={fulfilled ? "text-[#a2e998]" : "text-[#e2ce91]"}>{label}</span>
      <span className="mt-1 block text-[0.68rem] text-[#9bb096]">{format.format(target)} target</span>
    </>
  );
}

export default function RankPanel({ member, oracleEligible }: {
  member: RankMember;
  oracleEligible: boolean;
}) {
  const current = getBayRankConfig(member.rank);
  const next = getNextBayPointRank(current.id);
  const crypti = getCryptiRankConfig(member.cryptiRank);
  const cryptiProgress = getNextPromotionProgress(member.lifetimePoints ?? 0, member);
  const nextCrypti = cryptiProgress?.track === "crypti"
    ? cryptiRanks.find((rank) => rank.label === cryptiProgress.label)
    : undefined;
  const nextLabel = next?.label ?? (
    current.id === "poster-iii" ? "Graduation" : oracleEligible ? "Oracle" : nextCrypti?.label
  );
  const currentTargets = new Map(getParticipationChecklist(current.id).map(({ activity, required }) => [activity, required]));
  const nextTargets = new Map(next ? getParticipationChecklist(next.id).map(({ activity, required }) => [activity, required]) : []);
  const rows: ProgressRow[] = [
    {
      label: "Lifetime points",
      total: member.lifetimePoints,
      currentTarget: crypti?.requiresGateKey ? undefined : crypti?.minLifetimePoints ??
        (current.minLifetimePoints || undefined),
      nextTarget: next?.minLifetimePoints ?? nextCrypti?.minLifetimePoints,
    },
    ...(current.id === "poster-iii" || current.id === "graduation" ? [{
      label: "Available tokens",
      total: member.bayoTokens,
      currentTarget: crypti?.id === "oracle" ? oracleBadgeTokenCost
        : current.id === "graduation" && !crypti ? graduationTokenCost : undefined,
      currentMet: current.id === "graduation" ? true : undefined,
      nextTarget: current.id === "poster-iii" ? graduationTokenCost : oracleEligible ? oracleBadgeTokenCost : undefined,
    }] : []),
    ...(Object.keys(participationLabels) as (keyof RankParticipation)[]).map((activity) => ({
      label: participationLabels[activity],
      total: member.rankParticipation?.[activity],
      currentTarget: currentTargets.get(activity),
      nextTarget: nextTargets.get(activity),
    })),
  ];

  return (
    <div className="grid min-w-0 gap-5 text-[#d7ffd0]">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9bb096]">Briefing Room</p>
        <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.12em] text-[#a2e998]">Rank</h2>
      </header>
      <dl className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="min-w-0 rounded-lg border border-[#31512b] bg-[#0b170b] p-3">
          <dt className="text-xs text-[#9bb096]">Current rank</dt>
          <dd className="mt-1 font-black">{crypti?.label ?? current.label}</dd>
        </div>
        <div className="min-w-0 rounded-lg border border-[#31512b] bg-[#0b170b] p-3">
          <dt className="text-xs text-[#9bb096]">Next rank</dt>
          <dd className="mt-1 font-black">{nextLabel ?? "Track complete"}</dd>
        </div>
      </dl>
      <table className="w-full table-fixed border-collapse border border-[#31512b] text-left text-xs sm:text-sm">
        <caption className="sr-only">Rank requirements and recorded activity totals</caption>
        <thead className="bg-[#0b170b] text-[#b6ccb2]">
          <tr>
            <th scope="col" className="w-[36%] px-2 py-3 sm:px-3">Requirement</th>
            <th scope="col" className="w-[16%] px-1 py-3 text-right sm:px-3">Total</th>
            <th scope="col" className="w-[24%] px-1 py-3 text-right sm:px-3">Current</th>
            <th scope="col" className="w-[24%] px-2 py-3 text-right sm:px-3">Next</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233d20] border-t border-[#31512b]">
          {rows.map(({ label, total, currentTarget, nextTarget, currentMet }) => (
            <tr key={label}>
              <th scope="row" className="px-2 py-2.5 font-normal sm:px-3">{label}</th>
              <td className="px-1 py-2.5 text-right tabular-nums [overflow-wrap:anywhere] sm:px-3">
                {total === undefined ? <span aria-label="Unavailable">—</span> : format.format(total)}
              </td>
              <td className="px-1 py-2.5 text-right tabular-nums [overflow-wrap:anywhere] sm:px-3">
                <Target total={total} target={currentTarget} met={currentMet} />
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums [overflow-wrap:anywhere] sm:px-3">
                <Target total={total} target={nextTarget} next />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!member.rankParticipation ? (
        <p className="text-xs text-[#e2ce91]">Participation totals are unavailable right now.</p>
      ) : null}
      <p className="text-xs text-[#9bb096]">A dash in a target column means that rank has no requirement for the activity.</p>
      {current.id === "poster-iii" ? (
        <p className="text-xs text-[#b6ccb2]">Purchase Graduation in Exchange once you have {graduationTokenCost} tokens.</p>
      ) : oracleEligible ? (
        <p className="text-xs text-[#b6ccb2]">Purchase the Oracle Badge in Badge Quest to advance.</p>
      ) : null}
    </div>
  );
}
