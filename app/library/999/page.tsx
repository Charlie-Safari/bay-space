import Link from "next/link";
import HomeBar from "../../components/home-bar";
import styles from "./page.module.css";

export default function Library999() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <Link
          href="/"
          className="mb-8 w-fit border border-[#39ff14] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          exit
        </Link>

        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\library\999&gt; hidden
        </p>

        <div className="w-full overflow-hidden border-2 border-[#39ff14] bg-black py-6 shadow-[0_0_24px_rgba(57,255,20,0.24)]">
          <div
            className={`${styles.bannerTrack} w-max whitespace-nowrap text-5xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl`}
          >
            SAH DUDE!!!
          </div>
        </div>

        <p className="mt-10 border-l-2 border-[#39ff14] pl-4 text-2xl font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
          c4bar is PROPER
        </p>
      </section>
    </main>
  );
}
