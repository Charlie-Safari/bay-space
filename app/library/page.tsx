import Link from "next/link";
import HomeBar from "../components/home-bar";

const entries = [
  {
    title: "Intro - 000",
    href: "/library/intro-000",
    context: "orientation",
  },
  {
    title: "Library - 001",
    href: "/library/001",
    context: "arrival",
  },
];

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

        <div className="mt-12 grid max-w-2xl gap-3">
          {entries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="group border-2 border-[#39ff14] bg-black px-4 py-4 text-left transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              <span className="block text-2xl font-black uppercase tracking-[0.18em]">
                {entry.title}
              </span>
              <span className="mt-2 block text-xs font-bold uppercase tracking-[0.24em] text-[#d7ffd0] group-hover:text-black">
                context: {entry.context}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
