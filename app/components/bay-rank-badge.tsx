import { getBayRankLevel } from "../../lib/bay-space-ranks";

export default function BayRankBadge({
  rank,
  comment = false,
}: {
  rank?: string;
  comment?: boolean;
}) {
  const level = getBayRankLevel(rank);
  const upgraded = level >= getBayRankLevel("poster-iii");
  if (!upgraded && (comment || level < getBayRankLevel("poster-ii"))) return null;

  const label = upgraded ? "Poster III badge" : "Poster II badge";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`ml-2 inline-block rounded border px-1 align-middle text-[0.65rem] leading-tight tracking-normal ${upgraded ? "border-[#f1d578]/60 text-[#f1d578]" : "border-[#72c16a]/60 text-[#a5e39e]"}`}
    >
      {upgraded ? "◆◆" : "◆"}
    </span>
  );
}
