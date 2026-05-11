import HomeBar from "../components/home-bar";
import BriefingRoomGate from "./briefing-room-gate";

type BriefingRoomProps = {
  searchParams: Promise<{
    member?: string;
  }>;
};

export default async function BriefingRoom({ searchParams }: BriefingRoomProps) {
  const { member = "" } = await searchParams;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\briefing-room&gt; gate
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          briefing room
        </h1>
        <BriefingRoomGate member={member} />
      </section>
    </main>
  );
}
