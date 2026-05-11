"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeMember(value: string) {
  return value.replace(/\D/g, "").slice(0, 3);
}

export default function MemberLookup() {
  const router = useRouter();
  const [member, setMember] = useState("");

  function openBriefingRoom() {
    const memberId = member.padStart(3, "0");

    if (!memberId || memberId === "000") {
      return;
    }

    router.push(`/briefing-room?member=${memberId}`);
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openBriefingRoom();
  }

  return (
    <form
      onSubmit={submitLookup}
      className="flex items-center gap-2 border border-[#1d7f12] bg-black px-2 py-1 font-[Courier_New,Courier,monospace]"
      aria-label="Open briefing room by member number"
    >
      <button
        type="button"
        onClick={openBriefingRoom}
        className="text-lg leading-none transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        aria-label="Open briefing room"
      >
        🛸
      </button>
      <input
        inputMode="numeric"
        maxLength={3}
        value={member}
        onChange={(event) => setMember(normalizeMember(event.target.value))}
        placeholder="###"
        className="w-14 bg-[#001100] px-2 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] outline-none placeholder:text-[#1d7f12] focus:ring-1 focus:ring-[#39ff14]"
        aria-label="Member number"
      />
    </form>
  );
}
