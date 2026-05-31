"use client";

import { useEffect, useState } from "react";

type ProfileStatsCardProps = {
  initialPageVisits: number;
  member: string;
  overallTotalScore: string;
  totalFavoriteCount: number;
  totalPostCount: number;
  totalPostVisitCount: number;
  totalTicketCount: number;
};

export default function ProfileStatsCard({
  initialPageVisits,
  member,
  overallTotalScore,
  totalFavoriteCount,
  totalPostCount,
  totalPostVisitCount,
  totalTicketCount,
}: ProfileStatsCardProps) {
  const [pageVisits, setPageVisits] = useState(initialPageVisits);
  const stats = [
    { label: "overall total score", value: `${overallTotalScore} pts` },
    { label: "profile page visits", value: pageVisits },
    { label: "total visits all posts", value: totalPostVisitCount },
    { label: "favorite diamonds received ◆", value: totalFavoriteCount },
    { label: "tickets received 🎟️", value: totalTicketCount },
    { label: "total # of posts", value: totalPostCount },
  ];

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/members/${member}/visit`, { method: "POST" })
      .then((response) =>
        response.ok ? response.json() : { pageVisits: initialPageVisits },
      )
      .then((data: { pageVisits?: number }) => {
        if (isMounted && typeof data.pageVisits === "number") {
          setPageVisits(data.pageVisits);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [initialPageVisits, member]);

  return (
    <details className="group mt-10 w-full border-2 border-[#39ff14] bg-black shadow-[0_0_18px_rgba(57,255,20,0.18)] lg:mt-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0] transition hover:bg-[#001100] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d7ffd0] [&::-webkit-details-marker]:hidden">
        <span>Stats</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#39ff14] transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="border-t border-[#1d7f12] p-4">
        <div className="overflow-hidden border border-[#1d7f12]">
          <div className="grid grid-cols-[1fr_auto] border-b border-[#1d7f12] bg-[#001100] text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
            <span className="border-r border-[#1d7f12] px-3 py-2">metric</span>
            <span className="px-3 py-2 text-right">count</span>
          </div>
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`grid grid-cols-[1fr_auto] text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0] ${
                index === stats.length - 1 ? "" : "border-b border-[#1d7f12]"
              }`}
            >
              <span className="border-r border-[#1d7f12] px-3 py-3">
                {stat.label}
              </span>
              <span className="min-w-20 px-3 py-3 text-right text-[#39ff14]">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
