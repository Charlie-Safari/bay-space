import HomeBar from "../components/home-bar";
import BriefingRoomGate from "./briefing-room-gate";
import styles from "./briefing-room.module.css";

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
  const initialPanel = shouldOpenInbox
    ? "inbox"
    : panel === "quiz" || panel === "exchange" || panel === "settings" || panel === "rank"
      ? panel
      : "id-card";

  return (
    <main className={`${styles.page} min-h-screen text-[#72c16a] font-mono`}>
      <HomeBar />

      <section className={`${styles.content} bay-briefing-copy mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16`}>
        <p className={`${styles.breadcrumb} mb-4 uppercase`}>
          c:\bay-space\briefing-room&gt; gate
        </p>
        <BriefingRoomGate
          initialInboxMember={inboxMember}
          initialPanel={initialPanel}
          member={member}
        />
      </section>
    </main>
  );
}
