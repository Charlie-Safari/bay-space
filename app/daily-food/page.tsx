import HomeBar from "../components/home-bar";
import DfHeadlineTerminal from "./df-headline-terminal";

type DailyFoodProps = {
  searchParams: Promise<{
    df?: string;
  }>;
};

export default async function DailyFood({ searchParams }: DailyFoodProps) {
  const { df } = await searchParams;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\daily-food&gt; standby
        </p>
        <h1 className="mb-10 text-5xl font-black uppercase tracking-[0.18em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
          daily food
        </h1>

        <DfHeadlineTerminal initialCode={df ?? ""} />
      </section>
    </main>
  );
}
