"use client";

import styles from "./profile.module.css";

import { useEffect, useState } from "react";

type ProfileStatsCardProps = {
  initialPageVisits: number;
  lifetimePoints: number;
  lifetimeTokens: number;
  member: string;
  totalFavoriteCount: number;
  totalPostCount: number;
  totalPostVisitCount: number;
  totalTicketCount: number;
};

function formatStatValue(value: number | string) {
  return typeof value === "number" ? value.toLocaleString("en-US") : value;
}

export default function ProfileStatsCard({
  initialPageVisits,
  lifetimePoints,
  lifetimeTokens,
  member,
  totalFavoriteCount,
  totalPostCount,
  totalPostVisitCount,
  totalTicketCount,
}: ProfileStatsCardProps) {
  const [pageVisits, setPageVisits] = useState(initialPageVisits);
  const [displayLifetimePoints, setDisplayLifetimePoints] =
    useState(lifetimePoints);
  const stats = [
    { label: "lifetime points", value: displayLifetimePoints },
    { label: "lifetime tokens", value: lifetimeTokens },
    { label: "profile page visits", value: pageVisits },
    { label: "total views on posts", value: totalPostVisitCount },
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
      .then(
        (data: {
          member?: { lifetimePoints?: number };
          pageVisits?: number;
        }) => {
          if (isMounted && typeof data.pageVisits === "number") {
            setPageVisits(data.pageVisits);
          }
          if (isMounted && typeof data.member?.lifetimePoints === "number") {
            setDisplayLifetimePoints(data.member.lifetimePoints);
          }
        },
      )
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [initialPageVisits, member]);

  return (
    <details className={styles.disclosure}>
      <summary className={styles.summary}>
        <span>Stats</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#72c16a] transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className={styles.disclosureBody}>
        <div className="overflow-hidden rounded-xl border border-[#365d36]">
          <div className="grid grid-cols-[1fr_auto] border-b border-[#365d36] bg-[#09150c] text-xs font-black uppercase tracking-[0.16em] text-[#9abc96]">
            <span className="border-r border-[#365d36] px-3 py-2">metric</span>
            <span className="px-3 py-2 text-right">count</span>
          </div>
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`grid grid-cols-[1fr_auto] text-sm font-black uppercase tracking-[0.16em] text-[#dce9d9] ${
                index === stats.length - 1 ? "" : "border-b border-[#365d36]"
              }`}
            >
              <span className="border-r border-[#365d36] px-3 py-3">
                {stat.label}
              </span>
              <span className="min-w-20 px-3 py-3 text-right text-[#72c16a]">
                {formatStatValue(stat.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
