import Link from "next/link";
import HomeBar from "../../components/home-bar";

export default function Intro000() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <article className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-3xl flex-col justify-center px-4 py-16">
        <Link
          href="/library"
          className="mb-8 w-fit border border-[#39ff14] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          back
        </Link>

        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\library\intro-000&gt; read
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          Intro - 000
        </h1>

        <div className="mt-10 space-y-6 border-l-2 border-[#39ff14] pl-4 text-base leading-8 text-[#d7ffd0] sm:text-lg">
          <p>
            You will find many articles here. Some will be maps. Some will be
            keys. Some will only glow correctly when read twice.
          </p>
          <p>
            The library is sorted by context: how a thing is used, where it
            appears, what pressure it answers, and what hidden room it opens.
          </p>
          <p className="uppercase tracking-[0.18em] text-[#39ff14]">
            first signal: the shelf listens before it labels.
          </p>
          <p>
            If the index begins to breathe, remain calm. It is only arranging
            itself around the question you have not asked yet.
          </p>
        </div>
      </article>
    </main>
  );
}
