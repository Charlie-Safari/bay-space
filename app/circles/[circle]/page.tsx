"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import HomeBar from "../../components/home-bar";
import {
  BayCircle,
  CircleMember,
  circleStoreEvent,
  getActiveMember,
  getCircle,
  joinCircle,
} from "../../components/circle-store";

type CirclePublicPageProps = {
  params: Promise<{
    circle: string;
  }>;
};

function formatCircleDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CirclePublicPage({ params }: CirclePublicPageProps) {
  const { circle: circleId } = use(params);
  const [activeMember, setActiveMember] = useState<CircleMember | null>(null);
  const [circle, setCircle] = useState<BayCircle | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [hasSyncedCircle, setHasSyncedCircle] = useState(false);

  const syncCircle = useCallback(async () => {
    const nextActiveMember = await getActiveMember();

    setActiveMember(
      nextActiveMember
        ? { member: nextActiveMember.member, name: nextActiveMember.name }
        : null,
    );
    setCircle(getCircle(decodeURIComponent(circleId)));
    setHasSyncedCircle(true);
  }, [circleId]);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      syncCircle();
    }, 0);
    window.addEventListener("storage", syncCircle);
    window.addEventListener("bay-space-auth", syncCircle);
    window.addEventListener(circleStoreEvent, syncCircle);

    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("storage", syncCircle);
      window.removeEventListener("bay-space-auth", syncCircle);
      window.removeEventListener(circleStoreEvent, syncCircle);
    };
  }, [syncCircle]);

  function joinSelectedCircle(code = "") {
    if (!circle) {
      return;
    }

    if (!activeMember) {
      setJoinMessage("sign in required");
      return;
    }

    const result = joinCircle(circle.id, activeMember, code);

    setJoinMessage(result.message);
    setAccessCode("");
    syncCircle();
  }

  const isCircleMember = Boolean(
    activeMember &&
      circle?.members.some((member) => member.member === activeMember.member),
  );
  const canViewCircle = circle?.visibility === "public" || isCircleMember;
  const needsAccessCode =
    circle?.visibility === "private" || circle?.joinMode === "invite";

  return (
    <main className="min-h-screen bg-[#020402] font-mono text-[#39ff14]">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-4xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          C:\BAY-SPACE\CIRCLES&gt; PUBLIC
        </p>

        {!hasSyncedCircle ? (
          <div className="border-2 border-[#1d7f12] bg-black p-5 text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
            loading circle
          </div>
        ) : circle && canViewCircle ? (
          <article className="border-2 border-[#39ff14] bg-black p-5 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
              {circle.visibility} circle / {circle.joinMode === "invite" ? "invite only" : "anyone can join"}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-5xl">
              {circle.circleLogo ? `${circle.circleLogo} ` : ""}
              {circle.name}
            </h1>
            <div className="mt-6 grid gap-3 text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
              <p>
                Founder:{" "}
                <Link
                  href={`/profile/${circle.ownerMember}`}
                  className="text-[#39ff14] underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#d7ffd0]"
                >
                  {circle.ownerName}
                </Link>
              </p>
              <p>Created: {formatCircleDate(circle.createdAt)}</p>
              <p>Group Description: {circle.groupDescription || "empty"}</p>
              <p>Circle Theme: {circle.circleTheme || "empty"}</p>
            </div>

            <section className="mt-6 border-t border-[#1d7f12] pt-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                Members
              </h2>
              <div className="mt-3 grid gap-2">
                {circle.members.map((circleMember) => (
                  <Link
                    key={circleMember.member}
                    href={`/profile/${circleMember.member}`}
                    className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    {circleMember.name}
                  </Link>
                ))}
              </div>
            </section>

            {!isCircleMember ? (
              <section className="mt-6 border-t border-[#1d7f12] pt-4">
                <button
                  type="button"
                  onClick={() => joinSelectedCircle()}
                  className="border border-[#39ff14] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  Join this circle
                </button>
                {needsAccessCode ? (
                  <div className="mt-4 grid max-w-sm gap-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#f5d76e]">
                        access code
                      </span>
                      <input
                        type="text"
                        maxLength={12}
                        value={accessCode}
                        onChange={(event) =>
                          setAccessCode(event.target.value.slice(0, 12))
                        }
                        className="border border-[#7f6d12] bg-black px-3 py-2 text-sm font-black tracking-[0.12em] text-[#f5d76e] outline-none focus:ring-2 focus:ring-[#f5d76e]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => joinSelectedCircle(accessCode)}
                      className="w-fit border border-[#f5d76e] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f5d76e] transition hover:bg-[#f5d76e] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#f5d76e]"
                    >
                      unlock
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}
          </article>
        ) : (
          <article className="border-2 border-[#1d7f12] bg-black p-5">
            <h1 className="text-2xl font-black uppercase tracking-[0.16em] text-[#39ff14]">
              circle unavailable
            </h1>
            <p className="mt-4 border-l-2 border-[#39ff14] pl-4 text-sm font-bold uppercase leading-6 tracking-[0.14em] text-[#d7ffd0]">
              This circle is private, missing, or not available from this browser.
            </p>
            <Link
              href="/briefing-room"
              className="mt-5 inline-block border border-[#39ff14] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
            >
              briefing room
            </Link>
          </article>
        )}

        {joinMessage ? (
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
            {joinMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
