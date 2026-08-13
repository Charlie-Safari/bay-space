import HomeBar from "../components/home-bar";
import BriefingRoomGate from "./briefing-room-gate";

type BriefingRoomProps = {
  searchParams: Promise<{
    inboxMember?: string;
    member?: string;
    panel?: string;
  }>;
};

export default async function BriefingRoom({ searchParams }: BriefingRoomProps) {
  const { inboxMember = "", member = "", panel = "" } = await searchParams;
  const shouldOpenInbox = panel === "inbox" || Boolean(inboxMember.trim());

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="bay-briefing-copy mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\briefing-room&gt; gate
        </p>
        <BriefingRoomGate
          initialInboxMember={inboxMember}
          initialPanel={shouldOpenInbox ? "inbox" : "id-card"}
          member={member}
        />
      </section>
    </main>
  );
}
