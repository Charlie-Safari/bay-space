"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { canAccessCrypti } from "../../lib/bay-space-roles";
import type { BayMember } from "../../lib/bay-space-types";
import MemberLookup from "./member-lookup";
import TerminalLoadingShell from "./terminal-loading-shell";

type HomeTab = {
  ariaLabel?: string;
  href: string;
  label: string;
  shortLabel?: string;
};

const baySpaceTabs: HomeTab[] = [
  { label: "Conspiracy", href: "/theories" },
  { label: "Facts on News", shortLabel: "Facts", href: "/facts-on-news" },
  { ariaLabel: "library", label: "📚", href: "/library" },
];

const activeMemberStorageKey = "bay-space-active-member";

function minimizeOpenPostWindows() {
  window.dispatchEvent(new Event("bay-space-minimize-posts"));
}

function returnToBriefingRoomHome() {
  window.dispatchEvent(new Event("bay-space-return-to-briefing-room"));
}

export default function HomeBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeMember, setActiveMember] = useState("");
  const [activeMemberRecord, setActiveMemberRecord] =
    useState<BayMember | null>(null);
  const [pendingRouteLabel, setPendingRouteLabel] = useState("");
  const [isBasecampLogoShaking, setIsBasecampLogoShaking] = useState(false);
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
          member?: BayMember | null;
        };
        const member = data.member ?? null;
        const memberId = member?.member ?? "";

        if (memberId) {
          window.localStorage.setItem(activeMemberStorageKey, memberId);
        } else {
          window.localStorage.removeItem(activeMemberStorageKey);
        }

        if (isMounted) {
          setActiveMember(memberId);
          setActiveMemberRecord(member);
        }

        return;
      }

      if (response.status === 401) {
        window.localStorage.removeItem(activeMemberStorageKey);

        if (isMounted) {
          setActiveMember("");
          setActiveMemberRecord(null);
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
    const isBasecampNavigation = label === "basecamp";

    if (isBasecampNavigation) {
      if (
        targetRoute === currentRoute ||
        window.location.pathname.startsWith("/briefing-room")
      ) {
        event.preventDefault();
        returnToBriefingRoomHome();
        setIsBasecampLogoShaking(false);
        window.requestAnimationFrame(() => {
          setIsBasecampLogoShaking(true);
        });
      }

      return;
    }

    if (targetRoute !== currentRoute) {
      setPendingRouteLabel(label);
      return;
    }

    if (label === "basecamp") {
      event.preventDefault();
      returnToBriefingRoomHome();
      setIsBasecampLogoShaking(false);
      window.requestAnimationFrame(() => {
        setIsBasecampLogoShaking(true);
      });
    }
  }

  function isActiveRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderTab(tab: HomeTab, wrapperClassName = "") {
    const active = isActiveRoute(tab.href);
    const routeLabel = tab.ariaLabel ?? tab.label;
    const isTextChannelTab =
      tab.label === "Conspiracy" || tab.label === "Facts on News";

    return (
      <div className={wrapperClassName}>
        <Link
          key={tab.href}
          href={tab.href}
          aria-label={tab.ariaLabel}
          aria-current={active ? "page" : undefined}
          onClick={(event) => startNavigation(event, tab.href, routeLabel)}
          className={`bay-terminal-copy grid min-h-11 w-full place-items-center border px-3 py-2 text-center leading-none transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] md:min-h-12 md:w-auto md:px-4 ${
            isTextChannelTab
              ? "text-[0.9rem] md:text-[1.14rem]"
              : "text-[0.78rem] md:text-[0.98rem]"
          } ${
            isTextChannelTab
              ? active
                ? "border-dashed border-[#39ff14] text-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.28)]"
                : "border-solid border-[#39ff14] text-[#39ff14] hover:border-dashed"
              : active
                ? "border-[#d7ffd0] bg-[#39ff14] text-black shadow-[0_0_16px_rgba(57,255,20,0.35)]"
                : "border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14] hover:text-black"
          } ${tab.ariaLabel === "library" ? "text-xl leading-none" : ""}`}
        >
          <span className="hidden md:inline">{tab.label}</span>
          <span className="md:hidden">{tab.shortLabel ?? tab.label}</span>
        </Link>
      </div>
    );
  }

  function renderCryptiTab(wrapperClassName = "") {
    const active = isActiveRoute("/crypti");

    return (
      <div className={wrapperClassName}>
        <Link
          key="/crypti"
          href="/crypti"
          aria-label="+CRYPTI"
          aria-current={active ? "page" : undefined}
          onClick={(event) => startNavigation(event, "/crypti", "+CRYPTI")}
          className={`bay-terminal-copy grid min-h-11 w-full place-items-center border px-3 py-2 text-center text-[0.62rem] transition focus:outline-none focus:ring-2 focus:ring-[#b8f1ff] md:min-h-12 md:w-auto md:px-4 md:text-xs ${
            active
              ? "border-[#b8f1ff] bg-[#59d6ff] text-black shadow-[0_0_18px_rgba(89,214,255,0.45)]"
              : "border-[#59d6ff] text-[#59d6ff] hover:bg-[#59d6ff] hover:text-black"
          }`}
        >
          +CRYPTI
        </Link>
      </div>
    );
  }

  const hasCryptiAccess = canAccessCrypti(activeMemberRecord);

  return (
    <>
      {pendingRouteLabel ? (
        <div className="bay-route-transition fixed inset-0 z-50 grid place-items-center bg-[#020402]/95 px-4 text-[#39ff14]">
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
        <div className="mx-auto flex w-full max-w-sm flex-wrap items-center justify-center gap-2 md:max-w-6xl md:gap-3">
          {hasCryptiAccess
            ? renderCryptiTab(
                "order-1 w-full max-w-36 md:order-1 md:w-auto md:max-w-none",
              )
            : null}
          {renderTab(
            baySpaceTabs[0],
            "order-3 w-[calc(50%-0.25rem)] max-w-44 md:order-2 md:w-auto md:max-w-none",
          )}

          <div className="order-2 flex w-full justify-center md:order-3 md:w-auto">
            <Link
              href={homeHref}
              aria-label="Basecamp"
              aria-current={
                pathname === "/" || pathname.startsWith("/briefing-room")
                  ? "page"
                  : undefined
              }
              onClick={(event) => startNavigation(event, homeHref, "basecamp")}
              onAnimationEnd={() => setIsBasecampLogoShaking(false)}
              className={`grid h-14 w-20 place-items-center bg-transparent transition hover:scale-[1.03] focus:outline-none md:h-20 md:w-32 ${
                isBasecampLogoShaking
                  ? "animate-[basecamp-logo-shake_220ms_ease-in-out]"
                  : ""
              }`}
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
          </div>

          {renderTab(
            baySpaceTabs[1],
            "order-3 w-[calc(50%-0.25rem)] max-w-44 md:order-4 md:w-auto md:max-w-none",
          )}
          {renderTab(
            baySpaceTabs[2],
            "order-4 w-16 md:order-5 md:w-auto",
          )}
        </div>

        {!activeMember ? (
          <div className="mx-auto mt-3 flex w-full max-w-6xl justify-center">
            <div className="w-full max-w-md">
              <MemberLookup />
            </div>
          </div>
        ) : null}
      </nav>
    </>
  );
}
