"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BayMemberStats,
  BayStatsMiscRow,
  BayStatsParticipationRow,
  BayStatsPostRow,
} from "../../lib/bay-space-types";

type StatsPanelProps = {
  member: {
    member: string;
    name: string;
  };
};

type StatsTable = {
  rows: BayStatsPostRow[];
  title: string;
};

type ParticipationTable = {
  rows: BayStatsParticipationRow[];
  title: string;
};

function EmptyRows({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-3 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]"
      >
        no stats yet
      </td>
    </tr>
  );
}

function PostStatsTable({ rows, title }: StatsTable) {
  return (
    <section className="border-2 border-[#1d7f12] bg-black">
      <div className="border-b border-[#1d7f12] px-3 py-3">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-left text-xs font-black uppercase tracking-[0.12em]">
          <thead className="bg-[#001100] text-[#7f9f78]">
            <tr>
              <th className="px-3 py-3">headline</th>
              <th className="px-3 py-3 text-right">views</th>
              <th className="px-3 py-3 text-right">diamonds</th>
              <th className="px-3 py-3 text-right">tickets</th>
              <th className="px-3 py-3 text-right">shares</th>
              <th className="px-3 py-3 text-right">points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#123b10] text-[#39ff14]">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-[300px] px-3 py-3 text-[#d7ffd0]">
                    {row.headline}
                  </td>
                  <td className="px-3 py-3 text-right">{row.views}</td>
                  <td className="px-3 py-3 text-right">{row.diamonds}</td>
                  <td className="px-3 py-3 text-right">{row.tickets}</td>
                  <td className="px-3 py-3 text-right">{row.shares}</td>
                  <td className="px-3 py-3 text-right">{row.points}</td>
                </tr>
              ))
            ) : (
              <EmptyRows colSpan={6} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ParticipationStatsTable({ rows, title }: ParticipationTable) {
  return (
    <section className="border-2 border-[#1d7f12] bg-black">
      <div className="border-b border-[#1d7f12] px-3 py-3">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-left text-xs font-black uppercase tracking-[0.12em]">
          <thead className="bg-[#001100] text-[#7f9f78]">
            <tr>
              <th className="px-3 py-3">headline</th>
              <th className="px-3 py-3 text-right">views</th>
              <th className="px-3 py-3 text-center">diamond</th>
              <th className="px-3 py-3 text-center">ticket</th>
              <th className="px-3 py-3 text-right">shares</th>
              <th className="px-3 py-3 text-right">points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#123b10] text-[#39ff14]">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-[300px] px-3 py-3 text-[#d7ffd0]">
                    {row.headline}
                  </td>
                  <td className="px-3 py-3 text-right">{row.views}</td>
                  <td className="px-3 py-3 text-center">
                    {row.diamond ? "yes" : "no"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.ticket ? "yes" : "no"}
                  </td>
                  <td className="px-3 py-3 text-right">{row.shares}</td>
                  <td className="px-3 py-3 text-right">{row.points}</td>
                </tr>
              ))
            ) : (
              <EmptyRows colSpan={6} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiscStatsTable({ rows }: { rows: BayStatsMiscRow[] }) {
  return (
    <section className="border-2 border-[#1d7f12] bg-black">
      <div className="border-b border-[#1d7f12] px-3 py-3">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
          misc points earned
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[520px] w-full border-collapse text-left text-xs font-black uppercase tracking-[0.12em]">
          <thead className="bg-[#001100] text-[#7f9f78]">
            <tr>
              <th className="px-3 py-3">source</th>
              <th className="px-3 py-3 text-right">value</th>
              <th className="px-3 py-3 text-right">points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#123b10] text-[#39ff14]">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-3 py-3 text-[#d7ffd0]">{row.label}</td>
                  <td className="px-3 py-3 text-right">{row.value}</td>
                  <td className="px-3 py-3 text-right">{row.points}</td>
                </tr>
              ))
            ) : (
              <EmptyRows colSpan={3} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function StatsPanel({ member }: StatsPanelProps) {
  const [stats, setStats] = useState<BayMemberStats | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const syncStats = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage("");

    const response = await fetch("/api/stats", { cache: "no-store" });
    const data = (await response.json()) as {
      message?: string;
      stats?: BayMemberStats;
    };

    setIsLoading(false);

    if (!response.ok || !data.stats) {
      setStatusMessage(data.message ?? "stats unavailable");
      return;
    }

    setStats(data.stats);
  }, []);

  useEffect(() => {
    const syncTimer = window.setTimeout(syncStats, 0);

    window.addEventListener("bay-space-auth", syncStats);

    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("bay-space-auth", syncStats);
    };
  }, [syncStats]);

  const postTables: StatsTable[] = stats
    ? [
        { rows: stats.conspiracyPosts, title: "Conspiracy posts" },
        { rows: stats.factsPosts, title: "Facts posts" },
        { rows: stats.cryptiNewsPosts, title: "+CRYPTI R NEWS POSTS" },
        { rows: stats.cryptiDegenPosts, title: "+CRYPTI Q DEGEN Post" },
        { rows: stats.cryptiBuzzPosts, title: "+CRYPTI S BUZZ Post" },
      ]
    : [];
  const participationTables: ParticipationTable[] = stats
    ? [
        {
          rows: stats.baySpaceParticipation,
          title: "BaySpace Participation",
        },
        { rows: stats.cryptiParticipation, title: "+crypti participation" },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            stats
          </p>
          <p className="mt-2 max-w-xl border-l-2 border-[#39ff14] pl-3 text-xs font-black uppercase leading-5 tracking-[0.16em] text-[#7f9f78]">
            {member.name} / {member.member}
          </p>
        </div>
        <button
          type="button"
          onClick={syncStats}
          disabled={isLoading}
          className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "loading" : "refresh"}
        </button>
      </div>

      {statusMessage ? (
        <p className="mt-4 border border-[#ffcc00] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#ffcc00]">
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4">
        {postTables.map((table) => (
          <PostStatsTable key={table.title} {...table} />
        ))}
        {participationTables.map((table) => (
          <ParticipationStatsTable key={table.title} {...table} />
        ))}
        {stats ? <MiscStatsTable rows={stats.miscPoints} /> : null}
      </div>
    </div>
  );
}
