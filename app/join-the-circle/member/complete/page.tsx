import Link from "next/link";
import HomeBar from "../../../components/home-bar";

type CompletePageProps = {
  searchParams: Promise<{
    member?: string;
  }>;
};

export default async function CompletePage({ searchParams }: CompletePageProps) {
  const { member = "33334" } = await searchParams;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          sign up complete
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          you have completed sign up, click briefing room to visit your home
          page
        </p>
        <Link
          href={`/briefing-room?member=${member}`}
          className="mt-8 w-fit border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          briefing room
        </Link>
      </section>
    </main>
  );
}
