"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./member-lookup.module.css";

type MemberLookupProps = {
  variant?: "terminal" | "welcome";
};

function normalizeLookup(value: string) {
  return value
    .trimStart()
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 30);
}

export default function MemberLookup({
  variant = "terminal",
}: MemberLookupProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entry, setEntry] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  function flashStatus(message: string) {
    setStatusMessage(message);
    setIsBlocked(false);
    window.setTimeout(() => setIsBlocked(true), 0);
  }

  async function findMember() {
    const lookup = entry.trim();

    if (!lookup || isSearching) {
      return;
    }

    if (/^\d+$/.test(lookup) && lookup.length !== 5) {
      flashStatus("enter a five-digit account number");
      return;
    }

    setIsSearching(true);
    setStatusMessage("");

    try {
      const memberResponse = await fetch(
        `/api/members?lookup=${encodeURIComponent(lookup)}`,
        { cache: "no-store" },
      );

      if (!memberResponse.ok) {
        flashStatus("no account found");
        return;
      }

      const memberData = (await memberResponse.json()) as {
        member?: { member: string } | null;
      };
      const memberId = memberData.member?.member ?? "";

      if (!memberId) {
        flashStatus("no account found");
        return;
      }

      const response = await fetch("/api/me", { cache: "no-store" });
      const data = response.ok
        ? ((await response.json()) as { member?: { member: string } | null })
        : { member: null };
      const activeMember = data.member?.member ?? "";

      if (activeMember === memberId) {
        router.push(`/briefing-room?member=${memberId}`);
        return;
      }

      if (activeMember) {
        flashStatus("already logged in");
        return;
      }

      router.push(`/login?account=${encodeURIComponent(memberId)}`);
    } catch {
      flashStatus("login lookup unavailable");
      inputRef.current?.focus();
    } finally {
      setIsSearching(false);
    }
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void findMember();
  }

  if (variant === "welcome") {
    return (
      <div className={styles.welcomeLookup}>
        <form
          onSubmit={submitLookup}
          className={`${styles.welcomeForm} ${isBlocked ? styles.shake : ""}`}
          aria-label="Log in with an account name or five-digit account number"
          onAnimationEnd={() => setIsBlocked(false)}
        >
          <input
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="username"
            maxLength={30}
            type="text"
            value={entry}
            onChange={(event) => {
              setEntry(normalizeLookup(event.target.value));
              setIsBlocked(false);
              setStatusMessage("");
            }}
            placeholder="5-digit account number or account name"
            aria-label="Five-digit account number or account name"
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? "finding" : "log in"} <span aria-hidden="true">→</span>
          </button>
        </form>
        {statusMessage ? (
          <p className={styles.welcomeStatus} aria-live="polite">
            {statusMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={submitLookup}
        className={`flex items-center justify-center gap-2 font-[Courier_New,Courier,monospace] ${
          isBlocked ? styles.shake : ""
        }`}
        aria-label="Log in with an account name or five-digit account number"
        onAnimationEnd={() => setIsBlocked(false)}
      >
        <span className="bay-terminal-copy whitespace-nowrap text-[10px] text-[#39ff14]">
          [LOG IN] --&gt;
        </span>
        <button
          type="submit"
          disabled={isSearching}
          className="text-lg leading-none transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:opacity-50"
          aria-label="Continue to password"
        >
          🛸
        </button>
        <input
          ref={inputRef}
          autoCapitalize="none"
          autoComplete="username"
          maxLength={30}
          type="text"
          value={entry}
          onChange={(event) => {
            setEntry(normalizeLookup(event.target.value));
            setIsBlocked(false);
            setStatusMessage("");
          }}
          placeholder="name or number"
          className="bay-terminal-field w-40 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-xs text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#1d7f12] focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14]"
          aria-label="Five-digit account number or account name"
        />
      </form>
      {statusMessage ? (
        <p className="bay-terminal-copy mt-1 text-[10px] text-[#39ff14]" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
