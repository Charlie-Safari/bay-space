import HomeBar from "../components/home-bar";
import TheoryAccessTerminal from "./theory-access-terminal";
import TheoryBoard from "./theory-board";

export default function Theories() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\conspiracy&gt; main
        </p>
        <h1 className="text-5xl font-black uppercase tracking-[0.18em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
          conspiracy
        </h1>
        <p className="bay-terminal-copy mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-sm leading-7 text-[#d7ffd0] sm:text-base">
          conspiracy board online. main feed ready for incoming field notes.
        </p>
        <TheoryBoard />
      </section>

      <TheoryAccessTerminal />
    </main>
  );
}
