import Link from "next/link";
import HomeBar from "../../components/home-bar";
import { canAccessAdminAnalytics } from "../../../lib/bay-space-roles";
import { getCurrentMember } from "../../../lib/bay-space-session";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const member = await getCurrentMember();
  const canViewAnalytics = canAccessAdminAnalytics(member);

  return (
    <main className="min-h-screen bg-[#020402] font-mono text-[#39ff14]">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\admin&gt; analytics
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          analytics
        </h1>

        {!member ? (
          <div className="mt-10 border-2 border-[#1d7f12] bg-black p-5 text-sm font-black uppercase leading-6 tracking-[0.18em] text-[#d7ffd0]">
            admin session required
          </div>
        ) : !canViewAnalytics ? (
          <div className="mt-10 border-2 border-[#ff3b3b] bg-black p-5 text-sm font-black uppercase leading-6 tracking-[0.18em] text-[#ff6b6b]">
            admin clearance required
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["captured events", "0"],
              ["member events", "0"],
              ["post events", "0"],
              ["exchange events", "0"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border-2 border-[#39ff14] bg-black p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                  {label}
                </p>
                <p className="mt-4 text-4xl font-black tracking-[0.12em]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        <Link
          href={member ? `/briefing-room?member=${member.member}` : "/"}
          className="mt-8 w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          basecamp
        </Link>
      </section>
    </main>
  );
}
