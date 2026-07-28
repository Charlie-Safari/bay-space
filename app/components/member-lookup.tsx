"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./member-lookup.module.css";

type LoginPhase = "lookup" | "password";

function normalizeLookup(value: string) {
  return value
    .trimStart()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
}

export default function MemberLookup() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entry, setEntry] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>("lookup");
  const [pendingMember, setPendingMember] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  function flashStatus(message: string) {
    setStatusMessage(message);
    setIsBlocked(false);
    window.setTimeout(() => setIsBlocked(true), 0);
  }

  function focusInput() {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  async function findMember() {
    const lookup = entry.trim();

    if (!lookup) {
      return;
    }

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

    setPendingMember(memberId);
    setLoginPhase("password");
    setEntry("");
    setStatusMessage("");
    focusInput();
  }

  async function submitPassword() {
    const pin = entry;

    if (!pendingMember || !pin) {
      return;
    }

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ member: pendingMember, pin }),
    });
    const data = (await response.json()) as {
      member?: { member: string } | null;
    };
    const memberId = data.member?.member ?? "";

    if (response.ok && memberId) {
      window.localStorage.setItem("bay-space-active-member", memberId);
      window.dispatchEvent(new Event("bay-space-auth"));
      router.push(`/briefing-room?member=${memberId}`);
      return;
    }

    setEntry("");
    flashStatus(response.status === 401 ? "try again" : "no account found");
    focusInput();
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void (loginPhase === "lookup" ? findMember() : submitPassword());
  }

  return (
    <div>
      <form
        onSubmit={submitLookup}
        className={`flex items-center justify-center gap-2 font-[Courier_New,Courier,monospace] ${
          isBlocked ? styles.shake : ""
        }`}
        aria-label="Open briefing room by username or member number"
        onAnimationEnd={() => setIsBlocked(false)}
      >
        <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-[#39ff14]">
          [LOG IN] --&gt;
        </span>
        <button
          type="submit"
          className="text-lg leading-none transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          aria-label="Open briefing room"
        >
          🛸
        </button>
        <input
          ref={inputRef}
          autoCapitalize="none"
          autoComplete={
            loginPhase === "lookup" ? "username" : "current-password"
          }
          maxLength={24}
          type={loginPhase === "lookup" ? "text" : "password"}
          value={entry}
          onChange={(event) => {
            const value = event.target.value;
            setEntry(
              loginPhase === "lookup"
                ? normalizeLookup(value)
                : value.slice(0, 24),
            );
            setIsBlocked(false);
            setStatusMessage("");
          }}
          placeholder={loginPhase === "lookup" ? "username" : "password"}
          className="w-40 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-xs font-black tracking-[0.12em] text-[#39ff14] outline-none placeholder:italic placeholder:text-[#1d7f12] focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14]"
          aria-label={
            loginPhase === "lookup"
              ? "Username or member number"
              : "Password"
          }
        />
      </form>
      {isBlocked ? (
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#39ff14]">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
