import HomeBar from "./components/home-bar";
import DfCodeSearch from "./components/df-code-search";
import LibraryCodeSearch from "./components/library-code-search";
import NewsCodeSearch from "./components/news-code-search";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <div className="mb-12 grid w-full max-w-6xl gap-4 lg:grid-cols-3">
          <DfCodeSearch />
          <NewsCodeSearch />
          <LibraryCodeSearch />
        </div>

        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\home&gt; boot
        </p>
        <h1 className="text-5xl font-black uppercase tracking-[0.2em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl md:text-8xl">
          bay-space
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          system online. signal clean. select a channel from the home bar.
        </p>
      </section>
    </main>
  );
}
