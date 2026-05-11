"use client";

import { FormEvent, useEffect, useState } from "react";

type BriefingRoomGateProps = {
  member: string;
};

type SavedMember = {
  member: string;
  name: string;
  pin: string;
  refName: string;
  roles: string;
  title: string;
};

function getMemberKey(memberId: string) {
  return `bay-space-circle-member-v6-${memberId}`;
}

const activeMemberKey = "bay-space-active-member-v6";

function getSavedMember(memberId: string): SavedMember | null {
  const savedMember = window.localStorage.getItem(getMemberKey(memberId));

  if (!savedMember) {
    return null;
  }

  return JSON.parse(savedMember) as SavedMember;
}

function maskPassword(pin: string) {
  return `${"*".repeat(Math.max(pin.length, 1))} [CLASSIFIED]`;
}

export default function BriefingRoomGate({ member }: BriefingRoomGateProps) {
  const [resolvedMember, setResolvedMember] = useState(() => {
    if (typeof window === "undefined") {
      return member;
    }

    return window.localStorage.getItem(activeMemberKey) ?? member;
  });
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.localStorage.getItem(activeMemberKey));
  });
  const [activePanel, setActivePanel] = useState("home");

  useEffect(() => {
    function syncActiveMember() {
      const activeMember = window.localStorage.getItem(activeMemberKey);

      setResolvedMember(activeMember ?? member);
      setIsUnlocked(Boolean(activeMember));
    }

    window.addEventListener("storage", syncActiveMember);
    window.addEventListener("bay-space-auth", syncActiveMember);

    return () => {
      window.removeEventListener("storage", syncActiveMember);
      window.removeEventListener("bay-space-auth", syncActiveMember);
    };
  }, [member]);

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const savedMember = getSavedMember(resolvedMember);

    if (!savedMember && password.trim()) {
      window.localStorage.setItem(activeMemberKey, resolvedMember);
      window.dispatchEvent(new Event("bay-space-auth"));
      setIsUnlocked(true);
      return;
    }

    if (savedMember && savedMember.pin === password) {
      window.localStorage.setItem(activeMemberKey, resolvedMember);
      window.dispatchEvent(new Event("bay-space-auth"));
      setIsUnlocked(true);
    }
  }

  function signOut() {
    window.localStorage.removeItem(activeMemberKey);
    window.dispatchEvent(new Event("bay-space-auth"));
    setIsUnlocked(false);
    setPassword("");
  }

  if (isUnlocked) {
    const savedMember =
      typeof window === "undefined" ? null : getSavedMember(resolvedMember);

    return (
      <div className="mt-10 grid w-full max-w-4xl gap-6 md:grid-cols-[220px_1fr]">
        <aside className="border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            options
          </p>
          <div className="mt-4 grid gap-3 text-sm font-black uppercase tracking-[0.12em] text-[#39ff14]">
            <button className="border border-[#1d7f12] px-3 py-2 text-left">
              saved posts
            </button>
            <button className="border border-[#1d7f12] px-3 py-2 text-left">
              favorites
            </button>
            <button className="border border-[#1d7f12] px-3 py-2 text-left">
              profile
            </button>
            <button
              onClick={() => setActivePanel("id-card")}
              className="border border-[#1d7f12] px-3 py-2 text-left"
            >
              ID card
            </button>
            <button
              onClick={signOut}
              className="border border-[#ff3b3b] px-3 py-2 text-left text-[#ff6b6b]"
            >
              sign out
            </button>
          </div>
        </aside>
        <section className="border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          {activePanel === "id-card" && savedMember ? (
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                EXPLORER NUMBER - #{savedMember.member}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                TITLE: {savedMember.title}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                NAME: {savedMember.name}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                PASSWORD: {maskPassword(savedMember.pin)}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                (REFERENCE NAME): {savedMember.refName || "-----"}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                member {resolvedMember || "---"}
              </p>
              <p className="mt-6 border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0]">
                briefing room area online. options will be expanded soon.
              </p>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <form
      onSubmit={unlock}
      className="mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]"
      aria-label="Enter briefing room password"
    >
      <label
        htmlFor="briefing-password"
        className="mb-3 block text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]"
      >
        enter password
      </label>
      <input
        id="briefing-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value.slice(0, 24))}
        className="w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
        autoFocus
      />
      <button
        type="submit"
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        enter
      </button>
    </form>
  );
}
