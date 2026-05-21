"use client";

import { useEffect, useState } from "react";

type ProfileStatsCardProps = {
  initialPageVisits: number;
  member: string;
  totalFavoriteCount: number;
};

export default function ProfileStatsCard({
  initialPageVisits,
  member,
  totalFavoriteCount,
}: ProfileStatsCardProps) {
  const [pageVisits, setPageVisits] = useState(initialPageVisits);

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
    <section className="mt-10 w-full border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)] lg:mt-0">
      <h2 className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
        Stats
      </h2>
      <div className="mt-5 overflow-hidden border border-[#1d7f12]">
        <div className="grid grid-cols-[1fr_auto] border-b border-[#1d7f12] bg-[#001100] text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
          <span className="border-r border-[#1d7f12] px-3 py-2">metric</span>
          <span className="px-3 py-2 text-right">count</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] border-b border-[#1d7f12] text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
          <span className="border-r border-[#1d7f12] px-3 py-3">
            page visits
          </span>
          <span className="min-w-20 px-3 py-3 text-right text-[#39ff14]">
            {pageVisits}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto] text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
          <span className="border-r border-[#1d7f12] px-3 py-3">
            total favorites
          </span>
          <span className="min-w-20 px-3 py-3 text-right text-[#39ff14]">
            {totalFavoriteCount}
          </span>
        </div>
      </div>
    </section>
  );
}
