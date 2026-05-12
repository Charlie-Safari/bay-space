import Link from "next/link";
import HomeBar from "../../components/home-bar";

const libraryEntries = [
  {
    code: "safari 1",
    href: "/library/admin-index",
    status: "hidden admin",
    title: "Admin Index",
  },
];

const channelEntries: {
  code: string;
  section: string;
  title: string;
}[] = [];

export default function AdminIndex() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\library\safari-1&gt; admin
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          admin index
        </h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
              library codes
            </h2>
            <div className="grid gap-3">
              {libraryEntries.map((entry) => (
                <Link
                  key={`${entry.code}-${entry.href}`}
                  href={entry.href}
                  className="border-2 border-[#39ff14] bg-black px-4 py-4 transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#d7ffd0]">
                    {entry.status}
                  </span>
                  <span className="mt-2 block text-xl font-black uppercase tracking-[0.14em]">
                    {entry.code}
                  </span>
                  <span className="mt-2 block text-sm font-bold uppercase tracking-[0.08em]">
                    {entry.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
              channel codes
            </h2>
            <div className="grid gap-3">
              {channelEntries.length ? (
                channelEntries.map((entry) => (
                  <div
                    key={`${entry.section}-${entry.code}-${entry.title}`}
                    className="border-2 border-[#39ff14] bg-black px-4 py-4"
                  >
                    <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#d7ffd0]">
                      {entry.section}
                    </span>
                    <span className="mt-2 block text-xl font-black uppercase tracking-[0.14em]">
                      {entry.code}
                    </span>
                    <span className="mt-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#d7ffd0]">
                      {entry.title}
                    </span>
                  </div>
                ))
              ) : (
                <div className="border-2 border-[#1d7f12] bg-black px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
                  no active channel codes
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
