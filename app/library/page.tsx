import Link from "next/link";
import LibraryCodeSearch from "../components/library-code-search";
import HomeBar from "../components/home-bar";
import LibraryBoard from "./library-board";

export default function Library() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\library&gt; map-context
        </p>
        <h1 className="text-5xl font-black uppercase tracking-[0.18em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
          library
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          organized by context, not container. choose a door by what it knows,
          not what it is made of.
        </p>

        <Link
          href="/library/card"
          target="_blank"
          rel="noopener"
          aria-label="Library Card (opens in a new tab)"
          className="mt-8 w-fit rounded-xl border border-[#426840] bg-[#0b170b] px-5 py-3 text-sm font-bold uppercase tracking-widest text-[#d7ffd0] hover:bg-[#152b15] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a2d59b]"
        >
          Library Card ↗
        </Link>

        <div className="mt-10">
          <LibraryCodeSearch />
        </div>

        <LibraryBoard />
      </section>
    </main>
  );
}
