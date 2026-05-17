"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MemberLookup from "./member-lookup";

const tabs = [
  { label: "top story", href: "/news" },
  { label: "daily food", href: "/daily-food" },
  { label: "theories", href: "/theories" },
  { label: "library", href: "/library" },
];

const activeMemberStorageKey = "bay-space-active-member";

export default function HomeBar() {
  const [activeMember, setActiveMember] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function syncActiveMember() {
      const cachedMember = window.localStorage.getItem(activeMemberStorageKey) ?? "";

      if (cachedMember && isMounted) {
        setActiveMember(cachedMember);
      }

      const response = await fetch("/api/me", { cache: "no-store" });

      if (response.ok) {
        const data = (await response.json()) as {
          member?: { member: string } | null;
        };
        const memberId = data.member?.member ?? "";

        if (memberId) {
          window.localStorage.setItem(activeMemberStorageKey, memberId);
        }

        if (isMounted) {
          setActiveMember(memberId);
        }

        return;
      }

      if (response.status === 401) {
        window.localStorage.removeItem(activeMemberStorageKey);

        if (isMounted) {
          setActiveMember("");
        }
      }
    }

    syncActiveMember();
    window.addEventListener("storage", syncActiveMember);
    window.addEventListener("bay-space-auth", syncActiveMember);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncActiveMember);
      window.removeEventListener("bay-space-auth", syncActiveMember);
    };
  }, []);

  const visibleTabs = activeMember
    ? [
        { label: "briefing room", href: `/briefing-room?member=${activeMember}` },
        ...tabs,
      ]
    : tabs;

  return (
    <nav
      aria-label="Main navigation"
      className="border-b-2 border-[#39ff14] bg-black px-4 py-3 shadow-[0_0_22px_rgba(57,255,20,0.28)]"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={
              activeMember ? `/briefing-room?member=${activeMember}` : "/"
            }
            className="text-xl font-black uppercase tracking-[0.24em] text-[#d7ffd0] [text-shadow:0_0_10px_#39ff14]"
          >
            bay-space
          </Link>
          <MemberLookup />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          {visibleTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="border border-[#39ff14] px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
