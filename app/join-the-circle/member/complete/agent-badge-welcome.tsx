"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getBayRankLabel,
  getBayRankLevel,
  type BayRank,
} from "../../../../lib/bay-space-ranks";
import styles from "./agent-badge-welcome.module.css";

type AgentBadgeWelcomeProps = {
  member: string;
};

type WelcomePhase =
  | "checking"
  | "typing"
  | "ready"
  | "destroying"
  | "matrix";

const matrixColumns = [
  "010011010101101001001101",
  "101100101011001010110010",
  "001011010010110100101101",
  "110010101100101011001010",
  "010110010101100101011001",
  "101001101010011010100110",
  "011010010110100101101001",
  "100101101001011010010110",
  "001101010011010100110101",
  "110100101101001011010010",
  "010010110100101101001011",
  "101101001011010010110100",
];

export default function AgentBadgeWelcome({ member }: AgentBadgeWelcomeProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<WelcomePhase>("checking");
  const [rank, setRank] = useState<BayRank>("reader");
  const [characterCount, setCharacterCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const timersRef = useRef<number[]>([]);
  const briefingHref = `/briefing-room?member=${member}`;
  const rankLabel = getBayRankLabel(rank);
  const rankLevel = getBayRankLevel(rank);
  const transmission = useMemo(
    () =>
      [
        "BAY SPACE IDENTIFICATION SYSTEM",
        "CLEARANCE RECORD FOUND...",
        "",
        `EXPLORER NUMBER: #${member}`,
        `RANK: LEVEL ${rankLevel} — ${rankLabel.toUpperCase()}`,
        "",
        "Explore Conspiracy and Current Events, earn points, and climb toward Graduation.",
      ].join("\n"),
    [member, rankLabel, rankLevel],
  );

  useEffect(() => {
    let isMounted = true;
    const timers = timersRef.current;

    async function checkOnboardingStatus() {
      try {
        const response = await fetch(`/api/members/${member}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          hasCompletedOnboarding?: boolean;
          member?: { rank?: BayRank };
        };

        if (!isMounted) {
          return;
        }

        if (data.hasCompletedOnboarding) {
          router.replace(briefingHref);
          return;
        }

        if (data.member?.rank) {
          setRank(data.member.rank);
        }

        setPhase("typing");
      } catch {
        if (isMounted) {
          setPhase("typing");
        }
      }
    }

    void checkOnboardingStatus();

    return () => {
      isMounted = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [briefingHref, member, router]);

  useEffect(() => {
    if (phase !== "typing") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const readyTimer = window.setTimeout(() => {
        setCharacterCount(transmission.length);
        setPhase("ready");
      }, 0);

      return () => window.clearTimeout(readyTimer);
    }

    const interval = window.setInterval(() => {
      setCharacterCount((currentCount) => {
        const nextCount = Math.min(currentCount + 1, transmission.length);

        if (nextCount === transmission.length) {
          window.clearInterval(interval);
          setPhase("ready");
        }

        return nextCount;
      });
    }, 22);

    return () => window.clearInterval(interval);
  }, [phase, transmission]);

  function finishTyping() {
    if (phase !== "typing") {
      return;
    }

    setCharacterCount(transmission.length);
    setPhase("ready");
  }

  async function enterBriefingRoom() {
    if (phase !== "ready") {
      return;
    }

    setErrorMessage("");

    try {
      const response = await fetch(`/api/members/${member}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "complete-onboarding" }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setErrorMessage(data.message ?? "unable to secure badge");
        return;
      }

      setPhase("destroying");
      const matrixTimer = window.setTimeout(() => setPhase("matrix"), 720);
      const routeTimer = window.setTimeout(
        () => router.replace(briefingHref),
        1900,
      );
      timersRef.current.push(matrixTimer, routeTimer);
    } catch {
      setErrorMessage("unable to secure badge");
    }
  }

  return (
    <main
      className={`${styles.page} ${phase === "matrix" ? styles.matrixActive : ""}`}
      onClick={finishTyping}
    >
      <div className={styles.scanlines} aria-hidden="true" />

      {phase === "matrix" ? (
        <div className={styles.matrixField} aria-hidden="true">
          {matrixColumns.map((column, index) => (
            <span
              key={`${column}-${index}`}
              style={{
                animationDelay: `${(index % 4) * -0.28}s`,
                animationDuration: `${1.15 + (index % 5) * 0.16}s`,
              }}
            >
              {column}
            </span>
          ))}
        </div>
      ) : null}

      <section className={styles.ceremony} aria-live="polite">
        <div className={styles.badgeFrame}>
          <Image
            src="/global-logo-bay-space.png"
            alt="Bay Space global terminal badge"
            width={1748}
            height={1766}
            priority
            className={styles.badgeImage}
          />
        </div>

        <div className={styles.terminalPanel}>
          <p className={styles.path}>c:\bay-space\identity&gt; issue-badge</p>

          {phase === "checking" ? (
            <p className={styles.checking}>checking clearance...</p>
          ) : phase === "destroying" ? (
            <div className={styles.destroyMessage}>
              <span>TRANSMISSION COMPLETE</span>
              <strong>THIS MESSAGE WILL NOW SELF-DESTRUCT...</strong>
            </div>
          ) : (
            <>
              <pre className={styles.transmission}>
                {transmission.slice(0, characterCount)}
                {phase === "typing" ? (
                  <span className={styles.cursor} aria-hidden="true">
                    █
                  </span>
                ) : null}
              </pre>

              {phase === "ready" ? (
                <div className={styles.readyArea}>
                  <p className={styles.verified}>
                    identity verified // badge issued
                  </p>
                  <button
                    type="button"
                    className={styles.enterButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      void enterBriefingRoom();
                    }}
                  >
                    Go to Briefing Room
                  </button>
                  {errorMessage ? (
                    <p className={styles.error} role="alert">
                      {errorMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
