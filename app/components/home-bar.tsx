"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import MemberLookup from "./member-lookup";
import { isCrypti } from "../../lib/bay-space-roles";
import TerminalLoadingShell from "./terminal-loading-shell";

type HomeTab = {
  href: string;
  isCrypti?: boolean;
  label: string;
};

const tabs: HomeTab[] = [
  { label: "top story", href: "/news" },
  { label: "daily food", href: "/daily-food" },
  { label: "theories", href: "/theories" },
  { label: "library", href: "/library" },
];

const activeMemberStorageKey = "bay-space-active-member";
const activeMemberRolesStorageKey = "bay-space-active-member-roles";

function minimizeOpenPostWindows() {
  window.dispatchEvent(new Event("bay-space-minimize-posts"));
}

export default function HomeBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeMember, setActiveMember] = useState("");
  const [activeMemberRoles, setActiveMemberRoles] = useState("");
  const [pendingRouteLabel, setPendingRouteLabel] = useState("");
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function syncActiveMember() {
      const cachedMember = window.localStorage.getItem(activeMemberStorageKey) ?? "";
      const cachedRoles =
        window.localStorage.getItem(activeMemberRolesStorageKey) ?? "";

      if (cachedMember && isMounted) {
        setActiveMember(cachedMember);
        setActiveMemberRoles(cachedRoles);
      }

      const response = await fetch("/api/me", { cache: "no-store" });

      if (response.ok) {
        const data = (await response.json()) as {
          member?: { member: string; roles?: string } | null;
        };
        const memberId = data.member?.member ?? "";
        const roles = data.member?.roles ?? "";

        if (memberId) {
          window.localStorage.setItem(activeMemberStorageKey, memberId);
          window.localStorage.setItem(activeMemberRolesStorageKey, roles);
        } else {
          window.localStorage.removeItem(activeMemberStorageKey);
          window.localStorage.removeItem(activeMemberRolesStorageKey);
        }

        if (isMounted) {
          setActiveMember(memberId);
          setActiveMemberRoles(roles);
        }

        return;
      }

      if (response.status === 401) {
        window.localStorage.removeItem(activeMemberStorageKey);
        window.localStorage.removeItem(activeMemberRolesStorageKey);

        if (isMounted) {
          setActiveMember("");
          setActiveMemberRoles("");
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

  const visibleTabs: HomeTab[] = useMemo(
    () => [
      ...(activeMember
        ? [
            {
              label: "briefing room",
              href: `/briefing-room?member=${activeMember}`,
            },
          ]
        : []),
      ...(isCrypti(activeMemberRoles)
        ? [{ isCrypti: true, label: "+Crypti", href: "/crypti" }]
        : []),
      ...tabs,
    ],
    [activeMember, activeMemberRoles],
  );

  const homeHref = activeMember ? `/briefing-room?member=${activeMember}` : "/";

  useEffect(() => {
    const prefetchHrefs = new Set([
      homeHref,
      ...visibleTabs.map((tab) => tab.href),
    ]);

    prefetchHrefs.forEach((href) => {
      router.prefetch(href);
    });
  }, [homeHref, router, visibleTabs]);

  useEffect(() => {
    if (!pendingRouteLabel) {
      return;
    }

    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = window.setTimeout(() => {
      setPendingRouteLabel("");
      transitionTimerRef.current = null;
    }, 220);

    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [pathname, pendingRouteLabel]);

  function startNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    label: string,
  ) {
    minimizeOpenPostWindows();

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target
    ) {
      return;
    }

    const targetUrl = new URL(href, window.location.href);
    const currentRoute = `${window.location.pathname}${window.location.search}`;
    const targetRoute = `${targetUrl.pathname}${targetUrl.search}`;

    if (targetRoute !== currentRoute) {
      setPendingRouteLabel(label);
    }
  }

  return (
    <>
      {pendingRouteLabel ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#020402]/95 px-4 text-[#39ff14]">
          <div className="w-full max-w-4xl">
            <TerminalLoadingShell
              label="c:\\bay-space\\router> switching-channel"
              title={pendingRouteLabel}
            />
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Main navigation"
        className="border-b-2 border-[#39ff14] bg-black px-4 py-3 shadow-[0_0_22px_rgba(57,255,20,0.28)]"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={homeHref}
              onClick={(event) => startNavigation(event, homeHref, "bay-space")}
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
                onClick={(event) => startNavigation(event, tab.href, tab.label)}
                className={`border px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                  tab.isCrypti
                    ? "border-[#72d7ff] text-[#72d7ff] hover:bg-[#72d7ff] hover:text-black"
                    : "border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
