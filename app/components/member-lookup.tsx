"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./member-lookup.module.css";

const activeMemberKey = "bay-space-active-member-v6";

function normalizeMember(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export default function MemberLookup() {
  const router = useRouter();
  const [member, setMember] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);

  function openBriefingRoom() {
    if (!member) {
      return;
    }

    const memberId = member.padStart(5, "0");

    const activeMember = window.localStorage.getItem(activeMemberKey);

    if (activeMember && activeMember !== memberId) {
      setIsBlocked(false);
      window.setTimeout(() => setIsBlocked(true), 0);
      return;
    }

    router.push(`/briefing-room?member=${memberId}`);
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openBriefingRoom();
  }

  return (
    <div>
      <form
        onSubmit={submitLookup}
        className={`flex items-center gap-2 border border-[#1d7f12] bg-black px-2 py-1 font-[Courier_New,Courier,monospace] ${
          isBlocked ? styles.shake : ""
        }`}
        aria-label="Open briefing room by member number"
        onAnimationEnd={() => setIsBlocked(false)}
      >
        <button
          type="submit"
          className="text-lg leading-none transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          aria-label="Open briefing room"
        >
          🛸
        </button>
        <input
          inputMode="numeric"
          maxLength={5}
          value={member}
          onChange={(event) => {
            setMember(normalizeMember(event.target.value));
            setIsBlocked(false);
          }}
          placeholder="#####"
          className="w-20 bg-[#001100] px-2 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] outline-none placeholder:text-[#1d7f12] focus:ring-1 focus:ring-[#39ff14]"
          aria-label="Member number"
        />
      </form>
      {isBlocked ? (
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#39ff14]">
          already logged in
        </p>
      ) : null}
    </div>
  );
}
