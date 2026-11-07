"use client";

import Link from "next/link";
import styles from "./crypti.module.css";

export const cryptiTabs = [
  { id: "signal-room", label: "Base Camp", href: "/crypti" },
  { id: "smoke", label: "Today’s Smoke", href: "/crypti?view=smoke" },
  { id: "tickers", label: "Tickers", href: "/crypti?view=tickers" },
  { id: "r-news", label: "R News", href: "/crypti?source=R" },
  { id: "q-degen", label: "Q Degen", href: "/crypti?source=Q" },
  { id: "s-buzz", label: "S Buzz", href: "/crypti?source=S" },
  { id: "crypti-circles", label: "+Circles", href: "/crypti?view=crypti-circles" },
] as const;

type CryptiTab = (typeof cryptiTabs)[number]["id"];

export default function CryptiNavigation({
  activePanel,
  onSelect,
  showTabs = true,
}: {
  activePanel?: string;
  onSelect?: (tab: CryptiTab) => void;
  showTabs?: boolean;
}) {
  function selectTab(event: { preventDefault(): void }, tab: (typeof cryptiTabs)[number]) {
    if (!onSelect) return;

    event.preventDefault();
    onSelect(tab.id);
    window.history.replaceState(null, "", tab.href);
  }

  return (
    <header className={styles.header}>
      <div className={styles.masthead}>
        <Link
          className={styles.wordmark}
          href="/crypti"
          aria-label="+CRYPTI Base Camp"
          onNavigate={(event) => selectTab(event, cryptiTabs[0])}
        >
          <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
            <path d="M3 25 16 6l13 19H3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="m12 12 4 6 4-6M16 18v7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          +CRYPTI
        </Link>
        <Link className={styles.returnLink} href="/">
          <span aria-hidden="true">↖</span> Bay Space
        </Link>
      </div>
      {showTabs ? (
        <nav className={styles.tabs} aria-label="+CRYPTI navigation">
          {cryptiTabs.map((tab) => (
            <Link
              className={styles.tab}
              key={tab.id}
              href={tab.href}
              prefetch={false}
              aria-current={tab.id === activePanel ? "page" : undefined}
              onNavigate={(event) => selectTab(event, tab)}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
