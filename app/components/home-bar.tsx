"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { canAccessCrypti } from "../../lib/bay-space-roles";
import type { BayMember } from "../../lib/bay-space-types";
import MemberLookup from "./member-lookup";
import MatrixLoadingScreen from "./matrix-loading-screen";

type HomeTab = {
  ariaLabel?: string;
  href: string;
  label: string;
  shortLabel?: string;
};

const baySpaceTabs: HomeTab[] = [
  { label: "Conspiracy", href: "/theories" },
  { label: "Current Events", href: "/facts-on-news" },
  { label: "Polls", href: "/polls" },
];

const activeMemberStorageKey = "bay-space-active-member";

function minimizeOpenPostWindows() {
  window.dispatchEvent(new Event("bay-space-minimize-posts"));
}

function returnToBriefingRoomHome() {
  window.dispatchEvent(new Event("bay-space-return-to-briefing-room"));
}

type HomeBarProps = {
  guestMode?: boolean;
};

export default function HomeBar({ guestMode = false }: HomeBarProps) {
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

  const homeHref =
    !guestMode && activeMember ? `/briefing-room?member=${activeMember}` : "/";

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

    const isFeedHome = href === "/theories" || href === "/facts-on-news";
    if (isFeedHome && targetUrl.pathname === window.location.pathname) {
      event.preventDefault();
      window.dispatchEvent(new Event("bay-space-return-to-feed-home"));
      return;
    }

    if (targetRoute !== currentRoute) {
      setPendingRouteLabel(label);
    }
  }

  function isActiveRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderTab(tab: HomeTab, wrapperClassName = "") {
    const active = isActiveRoute(tab.href);
    const routeLabel = tab.ariaLabel ?? tab.label;
    const isTextChannelTab =
      tab.label === "Conspiracy" ||
      tab.label === "Current Events" ||
      tab.label === "Polls";

    return (
      <div className={wrapperClassName}>
        <Link
          key={tab.href}
          href={tab.href}
          aria-label={tab.ariaLabel}
          aria-current={active ? "page" : undefined}
          onClick={(event) => startNavigation(event, tab.href, routeLabel)}
          className={`bay-terminal-copy grid min-h-11 w-full place-items-center rounded-xl border px-3 py-2 text-center leading-none backdrop-blur-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#8fca87]/45 md:min-h-12 md:w-auto md:px-4 ${
            isTextChannelTab
              ? "text-[0.9rem] md:text-[1.14rem]"
              : "text-[0.78rem] md:text-[0.98rem]"
          } ${
            isTextChannelTab
              ? active
                ? "border-[#90d587]/70 bg-[linear-gradient(145deg,rgba(114,193,106,0.22),rgba(5,14,6,0.82))] text-[#dce9d9] shadow-[inset_0_1px_rgba(223,243,218,0.07),0_10px_28px_rgba(0,0,0,0.22)]"
                : "border-[#72c16a]/35 bg-[#071108]/75 text-[#72c16a] shadow-[inset_0_1px_rgba(223,243,218,0.04),0_8px_24px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:border-[#90d587]/70 hover:bg-[#72c16a]/12 hover:text-[#dce9d9]"
              : active
                ? "border-[#90d587]/70 bg-[#72c16a]/20 text-[#dce9d9] shadow-[inset_0_1px_rgba(223,243,218,0.07),0_10px_28px_rgba(0,0,0,0.22)]"
                : "border-[#72c16a]/35 bg-[#071108]/75 text-[#72c16a] hover:-translate-y-0.5 hover:border-[#90d587]/70 hover:bg-[#72c16a]/12 hover:text-[#dce9d9]"
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
          className={`bay-terminal-copy grid min-h-11 w-full place-items-center rounded-xl border px-3 py-2 text-center text-[0.62rem] backdrop-blur-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#8ddff5]/45 md:min-h-12 md:w-auto md:px-4 md:text-xs ${
            active
              ? "border-[#8ddff5]/75 bg-[linear-gradient(145deg,rgba(89,214,255,0.22),rgba(4,13,16,0.84))] text-[#dff8ff] shadow-[inset_0_1px_rgba(223,248,255,0.08),0_10px_28px_rgba(0,0,0,0.22)]"
              : "border-[#59d6ff]/40 bg-[#061115]/75 text-[#71d7f2] shadow-[inset_0_1px_rgba(223,248,255,0.04),0_8px_24px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:border-[#8ddff5]/75 hover:bg-[#59d6ff]/12 hover:text-[#dff8ff]"
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
        <div className="bay-route-transition fixed inset-0 z-50 overflow-hidden">
          <MatrixLoadingScreen
            label="c:\\bay-space\\matrix> switching-channel"
            title={pendingRouteLabel}
          />
        </div>
      ) : null}

      <nav
        aria-label="Main navigation"
        className={`border-b-2 bg-black px-4 py-3 ${
          guestMode
            ? "border-[#4f8f49] shadow-[0_0_18px_rgba(79,143,73,0.18)]"
            : "border-[#39ff14] shadow-[0_0_22px_rgba(57,255,20,0.28)]"
        }`}
      >
        <div className="mx-auto flex w-full max-w-sm flex-wrap items-center justify-center gap-2 md:max-w-6xl md:gap-3">
          {!guestMode && hasCryptiAccess
            ? renderCryptiTab(
                "order-1 w-full max-w-36 md:order-1 md:w-auto md:max-w-none",
              )
            : null}
          {!guestMode
            ? renderTab(
                baySpaceTabs[0],
                "order-3 w-[calc(50%-0.25rem)] max-w-44 md:order-2 md:w-auto md:max-w-none",
              )
            : null}

          <div className="order-2 flex w-full justify-center md:order-3 md:w-auto">
            <Link
              href={homeHref}
              aria-label={guestMode ? "Bay Space home" : "Basecamp"}
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
                className={`h-full w-full object-contain ${
                  guestMode
                    ? "opacity-80 drop-shadow-[0_0_8px_rgba(114,193,106,0.35)]"
                    : "drop-shadow-[0_0_10px_rgba(57,255,20,0.55)]"
                }`}
              />
              <span className="sr-only">
                {guestMode ? "Bay Space home" : "Basecamp"}
              </span>
            </Link>
          </div>

          {!guestMode
            ? renderTab(
                baySpaceTabs[1],
                "order-3 w-[calc(50%-0.25rem)] max-w-44 md:order-4 md:w-auto md:max-w-none",
              )
            : null}
          {renderTab(
            baySpaceTabs[2],
            "order-4 w-full max-w-44 md:order-5 md:w-auto md:max-w-none",
          )}
        </div>

        {!guestMode && !activeMember ? (
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
