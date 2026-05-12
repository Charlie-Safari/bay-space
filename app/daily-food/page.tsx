import DailyFoodShell from "./daily-food-shell";
import HomeBar from "../components/home-bar";

export default function DailyFood() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\daily-food&gt; main
        </p>
        <DailyFoodShell />
      </section>
    </main>
  );
}
