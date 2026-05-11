import Link from "next/link";
import HomeBar from "./components/home-bar";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <h1 className="text-5xl font-black uppercase tracking-[0.2em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl md:text-8xl">
          bay-space
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          system online. signal clean. select a channel from the home bar.
        </p>
        <Link
          href="/join-the-circle"
          className="mt-10 w-fit border-2 border-[#39ff14] bg-black px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          join the circle
        </Link>
      </section>
    </main>
  );
}
