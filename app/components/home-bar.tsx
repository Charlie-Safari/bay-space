"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useRef, useState } from "react";
import MemberLookup from "./member-lookup";
import TerminalLoadingShell from "./terminal-loading-shell";

type HomeTab = {
  ariaLabel?: string;
  href: string;
  label: string;
  shortLabel?: string;
};

const baySpaceTabs: HomeTab[] = [
  { label: "conspiracy", href: "/theories" },
  { label: "facts on news", shortLabel: "facts", href: "/daily-food" },
  { ariaLabel: "library", label: "📚", href: "/library" },
];

const activeMemberStorageKey = "bay-space-active-member";

function minimizeOpenPostWindows() {
  window.dispatchEvent(new Event("bay-space-minimize-posts"));
}

export default function HomeBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeMember, setActiveMember] = useState("");
  const [pendingRouteLabel, setPendingRouteLabel] = useState("");
  const transitionTimerRef = useRef<number | null>(null);

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
        } else {
          window.localStorage.removeItem(activeMemberStorageKey);
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

  const homeHref = activeMember ? `/briefing-room?member=${activeMember}` : "/";

  useEffect(() => {
    const prefetchHrefs = new Set([
      homeHref,
      ...baySpaceTabs.map((tab) => tab.href),
    ]);

    prefetchHrefs.forEach((href) => {
      router.prefetch(href);
    });
  }, [homeHref, router]);

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

  function isActiveRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderTab(tab: HomeTab) {
    const active = isActiveRoute(tab.href);
    const routeLabel = tab.ariaLabel ?? tab.label;

    return (
      <Link
        key={tab.href}
        href={tab.href}
        aria-label={tab.ariaLabel}
        aria-current={active ? "page" : undefined}
        onClick={(event) => startNavigation(event, tab.href, routeLabel)}
        className={`grid min-h-11 w-full place-items-center border px-2 py-2 text-center text-[0.62rem] font-black uppercase tracking-[0.08em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] sm:min-h-12 sm:w-auto sm:px-3 sm:text-xs sm:tracking-[0.18em] ${
          active
            ? "border-[#d7ffd0] bg-[#39ff14] text-black shadow-[0_0_16px_rgba(57,255,20,0.35)]"
            : "border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14] hover:text-black"
        } ${tab.ariaLabel === "library" ? "text-xl" : ""}`}
      >
        <span className="hidden sm:inline">{tab.label}</span>
        <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
      </Link>
    );
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
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <div className="flex justify-end">{renderTab(baySpaceTabs[0])}</div>

          <Link
            href={homeHref}
            aria-label="Basecamp"
            aria-current={
              pathname === "/" || pathname.startsWith("/briefing-room")
                ? "page"
                : undefined
            }
            onClick={(event) => startNavigation(event, homeHref, "basecamp")}
            className="grid h-14 w-20 justify-self-center place-items-center bg-transparent transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] sm:h-20 sm:w-32"
          >
            <Image
              src="/brand/bay-space-logo.png"
              alt=""
              width={1148}
              height={736}
              priority
              className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(57,255,20,0.55)]"
            />
            <span className="sr-only">Basecamp</span>
          </Link>

          <div className="grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2 sm:grid-cols-[minmax(0,1fr)_3.5rem]">
            {baySpaceTabs.slice(1).map(renderTab)}
          </div>
        </div>

        <div className="mx-auto mt-3 flex w-full max-w-6xl justify-center">
          <div className="w-full max-w-md">
            <MemberLookup />
          </div>
        </div>
      </nav>
    </>
  );
}
