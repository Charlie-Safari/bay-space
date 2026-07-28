"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./member-lookup.module.css";

function normalizeLookup(value: string) {
  return value
    .trimStart()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
}

export default function MemberLookup() {
  const router = useRouter();
  const [member, setMember] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);

  async function openBriefingRoom() {
    const lookup = member.trim();

    if (!lookup) {
      return;
    }

    const memberResponse = await fetch(
      `/api/members?lookup=${encodeURIComponent(lookup)}`,
      { cache: "no-store" },
    );

    if (!memberResponse.ok) {
      setIsBlocked(false);
      window.setTimeout(() => setIsBlocked(true), 0);
      return;
    }

    const memberData = (await memberResponse.json()) as {
      member?: { member: string } | null;
    };
    const memberId = memberData.member?.member ?? "";

    if (!memberId) {
      setIsBlocked(false);
      window.setTimeout(() => setIsBlocked(true), 0);
      return;
    }

    const response = await fetch("/api/me", { cache: "no-store" });
    const data = response.ok
      ? ((await response.json()) as { member?: { member: string } | null })
      : { member: null };
    const activeMember = data.member?.member ?? "";

    if (activeMember && activeMember !== memberId) {
      setIsBlocked(false);
      window.setTimeout(() => setIsBlocked(true), 0);
      return;
    }

    router.push(`/briefing-room?member=${memberId}`);
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void openBriefingRoom();
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
          autoCapitalize="none"
          autoComplete="username"
          maxLength={24}
          value={member}
          onChange={(event) => {
            setMember(normalizeLookup(event.target.value));
            setIsBlocked(false);
          }}
          placeholder="username"
          className="w-40 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-xs font-black tracking-[0.12em] text-[#39ff14] outline-none placeholder:italic placeholder:text-[#1d7f12] focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14]"
          aria-label="Username or member number"
        />
      </form>
      {isBlocked ? (
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#39ff14]">
          no account found / already logged in
        </p>
      ) : null}
    </div>
  );
}
