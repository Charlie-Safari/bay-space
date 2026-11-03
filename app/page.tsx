import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "../lib/bay-space-session";
import MemberLookup from "./components/member-lookup";
import styles from "./welcome-intro.module.css";

const welcomePaths = [
  {
    eyebrow: "01 / begin here",
    title: "Conspiracies",
    description:
      "Follow the theory, inspect the evidence, and decide what holds up.",
    href: "/theories",
    callToAction: "enter conspiracies",
    featured: true,
  },
  {
    eyebrow: "02 / look outside",
    title: "Know Something",
    description:
      "A small commitment to understanding the world beyond your own.",
    href: "/facts-on-news",
    callToAction: "see what is happening",
    featured: false,
  },
  {
    eyebrow: "03 / take part",
    title: "Join the Circle",
    description:
      "Reading is open. Join when you are ready to comment, contribute, and earn.",
    href: "/join-the-circle",
    callToAction: "become a member",
    featured: false,
  },
];

export default async function Home() {
  const member = await getCurrentMember();

  if (member) {
    redirect(`/briefing-room?member=${member.member}`);
  }

  return (
    <main className={styles.welcome}>
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.orbit} aria-hidden="true" />

      <section className={styles.shell} aria-labelledby="welcome-title">
        <header className={styles.header}>
          <Link className={styles.wordmark} href="/" aria-label="Bay Space home">
            BAY<span>—</span>SPACE
          </Link>
          <MemberLookup variant="welcome" />
        </header>

        <div className={styles.introduction}>
          <h1 className={styles.lede} id="welcome-title">
            Explore freely. Question what you find. Join only when you want your
            voice in the conversation.
          </h1>
        </div>

        <nav className={styles.paths} aria-label="Choose where to begin">
          {welcomePaths.map((path) => (
            <div
              className={styles.pathWrap}
              key={path.href}
            >
              {path.featured ? (
                <div className={styles.guide} aria-hidden="true">
                  <span>start here</span>
                  <b>↓</b>
                </div>
              ) : null}
              <Link
                className={styles.path}
                href={path.href}
              >
                <span className={styles.eyebrow}>{path.eyebrow}</span>
                <span className={styles.pathTitle}>{path.title}</span>
                <span className={styles.description}>{path.description}</span>
                <span className={styles.action}>
                  {path.callToAction} <b aria-hidden="true">→</b>
                </span>
              </Link>
            </div>
          ))}
        </nav>

        <footer className={styles.note}>
          <span>NO PAYWALL TO LOOK.</span>
          <span>MEMBERSHIP BEGINS WHEN YOU PARTICIPATE.</span>
        </footer>
      </section>
    </main>
  );
}
