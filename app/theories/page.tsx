import HomeBar from "../components/home-bar";
import { getCurrentMember } from "../../lib/bay-space-session";
import TheoryBoard from "./theory-board";
import styles from "./theory-experience.module.css";

export default async function Theories({ searchParams }: {
  searchParams: Promise<{ section?: string }>;
}) {
  const member = await getCurrentMember();
  const { section } = await searchParams;

  return (
    <main className={`${styles.page} min-h-screen text-[#72c16a] font-mono`}>
      <HomeBar guestMode={!member} />

      <section className={`${styles.content} mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16`}>
        <TheoryBoard showKnowSomething={section === "know-something"} />
      </section>
    </main>
  );
}
