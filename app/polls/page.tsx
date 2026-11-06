import HomeBar from "../components/home-bar";
import { getCurrentMember } from "../../lib/bay-space-session";
import PollBoard from "./poll-board";
import styles from "../theories/theory-experience.module.css";

type PollsPageProps = {
  searchParams: Promise<{ create?: string }>;
};

export default async function PollsPage({ searchParams }: PollsPageProps) {
  const [member, params] = await Promise.all([getCurrentMember(), searchParams]);

  return (
    <main className={`${styles.page} min-h-screen text-[#72c16a] font-mono`}>
      <HomeBar guestMode={!member} />
      <section className={`${styles.content} mx-auto min-h-[calc(100vh-89px)] w-full max-w-7xl px-4 py-14 sm:px-6`}>
        <PollBoard initialCreate={params.create === "1"} />
      </section>
    </main>
  );
}
