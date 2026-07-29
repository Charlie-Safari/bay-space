"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { canAccessCrypti } from "../../lib/bay-space-roles";
import {
  moneyPrinterICardId,
  moneyPrinterIIntervalMs,
} from "../../lib/bay-space-ranks";
import type { BayMember } from "../../lib/bay-space-types";

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

export const baySpaceHowToOpenEvent = "bay-space-open-how-to";

function getMountainStandardTime() {
  return formatter.format(new Date());
}

export default function MountainTimeFooter() {
  const [time, setTime] = useState(getMountainStandardTime);
  const [showVersion, setShowVersion] = useState(false);
  const [activeMemberRecord, setActiveMemberRecord] =
    useState<BayMember | null>(null);
  const [isAtPageEnd, setIsAtPageEnd] = useState(false);
  const [moneyPrinterIEarned, setMoneyPrinterIEarned] = useState(0);
  const moneyPrinterIActiveSinceRef = useRef<number | null>(null);
  const isMoneyPrinterIClaimingRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(getMountainStandardTime());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncMemberAccess() {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = response.ok
        ? ((await response.json()) as {
            member?: BayMember | null;
          })
        : { member: null };

      if (isMounted) {
        setActiveMemberRecord(data.member ?? null);
      }
    }

    syncMemberAccess().catch(() => {
      if (isMounted) {
        setActiveMemberRecord(null);
      }
    });
    window.addEventListener("bay-space-auth", syncMemberAccess);

    return () => {
      isMounted = false;
      window.removeEventListener("bay-space-auth", syncMemberAccess);
    };
  }, []);

  const hasCryptiAccess = Boolean(
    activeMemberRecord && canAccessCrypti(activeMemberRecord),
  );
  const hasMoneyPrinterIActive = Boolean(
    activeMemberRecord?.activeBayoCards.includes(moneyPrinterICardId),
  );

  useEffect(() => {
    if (!hasMoneyPrinterIActive || !activeMemberRecord) {
      moneyPrinterIActiveSinceRef.current = null;
      return;
    }

    function canGenerate() {
      return (
        document.visibilityState === "visible" &&
        document.hasFocus() &&
        hasMoneyPrinterIActive
      );
    }

    function startGenerating() {
      if (canGenerate() && moneyPrinterIActiveSinceRef.current === null) {
        moneyPrinterIActiveSinceRef.current = Date.now();
      }
    }

    function stopGenerating() {
      moneyPrinterIActiveSinceRef.current = null;
    }

    async function claimMoneyPrinterI() {
      if (
        !activeMemberRecord ||
        isMoneyPrinterIClaimingRef.current ||
        !moneyPrinterIActiveSinceRef.current ||
        Date.now() - moneyPrinterIActiveSinceRef.current < moneyPrinterIIntervalMs
      ) {
        return;
      }

      isMoneyPrinterIClaimingRef.current = true;

      try {
        const response = await fetch(
          `/api/members/${activeMemberRecord.member}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "claim-money-printer-i" }),
          },
        );
        const data = (await response.json().catch(() => null)) as {
          member?: BayMember;
          points?: number;
        } | null;

        if (response.ok && data?.member) {
          setActiveMemberRecord(data.member);
          setMoneyPrinterIEarned((current) => current + (data.points ?? 0));
          window.dispatchEvent(new Event("bay-space-auth"));
        }
      } finally {
        moneyPrinterIActiveSinceRef.current = canGenerate() ? Date.now() : null;
        isMoneyPrinterIClaimingRef.current = false;
      }
    }

    function handlePointerOut(event: PointerEvent) {
      if (!event.relatedTarget) {
        stopGenerating();
      }
    }

    function handleVisibilityChange() {
      if (canGenerate()) {
        startGenerating();
      } else {
        stopGenerating();
      }
    }

    startGenerating();
    const timer = window.setInterval(() => {
      startGenerating();
      claimMoneyPrinterI().catch(() => undefined);
    }, 60000);

    window.addEventListener("pointermove", startGenerating, { passive: true });
    window.addEventListener("pointerout", handlePointerOut);
    window.addEventListener("focus", startGenerating);
    window.addEventListener("blur", stopGenerating);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointermove", startGenerating);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("focus", startGenerating);
      window.removeEventListener("blur", stopGenerating);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeMemberRecord, hasMoneyPrinterIActive]);

  useEffect(() => {
    let frame = 0;

    function syncFooterVisibility() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const pageHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        );
        const viewportBottom = window.scrollY + window.innerHeight;

        setIsAtPageEnd(viewportBottom >= pageHeight - 8);
      });
    }

    syncFooterVisibility();
    window.addEventListener("scroll", syncFooterVisibility, { passive: true });
    window.addEventListener("resize", syncFooterVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncFooterVisibility);
      window.removeEventListener("resize", syncFooterVisibility);
    };
  }, []);

  if (!isAtPageEnd) {
    return null;
  }

  return (
    <footer className="fixed inset-x-0 bottom-3 z-50 border-y border-[#39ff14] bg-black px-4 py-3 font-[Courier_New,Courier,monospace] text-xs font-bold uppercase tracking-[0.18em] text-[#d7ffd0] shadow-[0_0_18px_rgba(57,255,20,0.22)]">
      <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/join-the-circle"
            className="text-left text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            join the circle
          </Link>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVersion((current) => !current)}
              className="border border-[#39ff14] px-2 py-1 text-left text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              aria-expanded={showVersion}
            >
              version
            </button>
            {showVersion ? (
              <span className="text-[#d7ffd0]" aria-live="polite">
                1.33
              </span>
            ) : null}
            {hasMoneyPrinterIActive ? (
              <span className="text-[#39ff14]" aria-live="polite">
                💸+{moneyPrinterIEarned.toLocaleString("en-US")}
              </span>
            ) : null}
          </span>
          <Link
            href="/library#how-to"
            onClick={() => {
              window.dispatchEvent(new Event(baySpaceHowToOpenEvent));
            }}
            className="footer-how-to-link text-left text-[#39ff14] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            ▶ how to ◀
          </Link>
          {hasCryptiAccess ? (
            <Link
              href="/crypti?howto=true"
              className="border border-[#72d7ff] px-2 py-1 text-left text-[#72d7ff] transition hover:bg-[#72d7ff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              +how to
            </Link>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <time suppressHydrationWarning>{time}</time>
          <p>5786 Anno Mundi ; 80 a.H., Raëlian</p>
        </div>
      </div>
    </footer>
  );
}
