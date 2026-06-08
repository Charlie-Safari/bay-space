"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BayCircle,
  CircleJoinMode,
  CircleMember,
  CircleVisibility,
  circleStoreEvent,
  createCircle,
  deleteCircle,
  getMutualPersonalCircleConnections,
  listCirclesForMember,
} from "../components/circle-store";

type CirclesPanelProps = {
  member: CircleMember;
};

const circleLogoOptions = ["◎", "◆", "✦", "☀", "☾", "★", "✓", "💎", "🎟️"];

export default function CirclesPanel({ member }: CirclesPanelProps) {
  const [circles, setCircles] = useState<BayCircle[]>([]);
  const [mutualConnections, setMutualConnections] = useState<CircleMember[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleVisibility, setCircleVisibility] =
    useState<CircleVisibility>("public");
  const [circleJoinMode, setCircleJoinMode] = useState<CircleJoinMode>("anyone");
  const [circleAccessCode, setCircleAccessCode] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [circleTheme, setCircleTheme] = useState("");
  const [circleLogo, setCircleLogo] = useState(circleLogoOptions[0]);

  const loadCircles = useCallback(async () => {
    const nextCircles = listCirclesForMember(member.member);
    const nextConnections = getMutualPersonalCircleConnections(member.member);

    await Promise.resolve();
    return {
      circles: nextCircles,
      mutualConnections: nextConnections,
    };
  }, [member.member]);

  useEffect(() => {
    let isMounted = true;

    async function syncMountedCircles() {
      const nextState = await loadCircles();

      if (!isMounted) {
        return;
      }

      setCircles(nextState.circles);
      setMutualConnections(nextState.mutualConnections);
    }

    syncMountedCircles();
    window.addEventListener("storage", syncMountedCircles);
    window.addEventListener(circleStoreEvent, syncMountedCircles);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncMountedCircles);
      window.removeEventListener(circleStoreEvent, syncMountedCircles);
    };
  }, [loadCircles]);

  function submitCircle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const circle = createCircle({
      accessCode: circleVisibility === "private" ? circleAccessCode : "",
      circleLogo,
      circleTheme,
      groupDescription,
      joinMode: circleJoinMode,
      name: circleName,
      owner: member,
      visibility: circleVisibility,
    });

    if (!circle) {
      return;
    }

    setCircleName("");
    setCircleVisibility("public");
    setCircleJoinMode("anyone");
    setCircleAccessCode("");
    setGroupDescription("");
    setCircleTheme("");
    setCircleLogo(circleLogoOptions[0]);
    setIsCreateCircleOpen(false);
  }

  function deleteMemberCircle(circleId: string) {
    deleteCircle(circleId, member.member);
    setSelectedCircleId("");
  }

  const selectedCircle =
    selectedCircleId === "my-circle"
      ? null
      : circles.find((circle) => circle.id === selectedCircleId) ?? null;

  if (selectedCircleId === "my-circle") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedCircleId("")}
          className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          back
        </button>
        <div className="mt-5 border-2 border-[#39ff14] bg-[#001100] px-4 py-4 shadow-[0_0_18px_rgba(57,255,20,0.16)]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
            MY CIRCLE
          </p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
            Personal Circle
          </p>
          <div className="mt-5 grid gap-2">
            {mutualConnections.length ? (
              mutualConnections.map((connection) => (
                <Link
                  key={connection.member}
                  href={`/profile/${connection.member}`}
                  className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  {connection.name}
                </Link>
              ))
            ) : (
              <p className="border-l-2 border-[#39ff14] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
                empty
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedCircle) {
    const isFounder = selectedCircle.ownerMember === member.member;

    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedCircleId("")}
          className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          back
        </button>
        <div className="mt-5 border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#39ff14]">
                {selectedCircle.circleLogo || circleLogoOptions[0]}{" "}
                {selectedCircle.name}
                {isFounder ? " (FOUNDER)" : ""}
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                {selectedCircle.visibility} circle
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                {selectedCircle.joinMode === "invite"
                  ? "invite only"
                  : "anyone can join"}
              </p>
            </div>
            {isFounder ? (
              <button
                type="button"
                onClick={() => deleteMemberCircle(selectedCircle.id)}
                className="grid h-7 w-7 shrink-0 place-items-center border border-[#ff3b3b] text-xs font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                aria-label={`Delete ${selectedCircle.name}`}
                title="Delete group"
              >
                x
              </button>
            ) : null}
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
            group description
          </p>
          <p className="mt-3 border border-[#1d7f12] px-3 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#d7ffd0]">
            {selectedCircle.groupDescription || "empty"}
          </p>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
            circle theme
          </p>
          <p className="mt-3 border border-[#1d7f12] px-3 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#d7ffd0]">
            {selectedCircle.circleTheme || "empty"}
          </p>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
            followers
          </p>
          <div className="mt-3 grid gap-2">
            {selectedCircle.members.map((circleMember) => (
              <Link
                key={circleMember.member}
                href={`/profile/${circleMember.member}`}
                className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              >
                {circleMember.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
        circles
      </p>
      <div className="mt-5 border-2 border-[#39ff14] bg-[#001100] px-3 py-3 shadow-[0_0_18px_rgba(57,255,20,0.16)]">
        <button
          type="button"
          onClick={() => setSelectedCircleId("my-circle")}
          className="block w-full text-left text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          MY CIRCLE
        </button>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
          Personal Circle
        </p>
        <div className="mt-4 grid gap-2">
          {mutualConnections.length ? (
            mutualConnections.map((connection) => (
              <Link
                key={connection.member}
                href={`/profile/${connection.member}`}
                className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              >
                {connection.name}
              </Link>
            ))
          ) : (
            <p className="border-l-2 border-[#39ff14] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
              empty
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {circles.length ? (
          circles.map((circle) => {
            const isFounder = circle.ownerMember === member.member;

            return (
              <div
                key={circle.id}
                className="border border-[#1d7f12] bg-[#001100] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCircleId(circle.id)}
                    className="block min-w-0 text-left text-sm font-black uppercase tracking-[0.14em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    {circle.name}
                    {circle.circleLogo ? ` ${circle.circleLogo}` : ""}
                    {isFounder ? " (FOUNDER)" : ""}
                  </button>
                  {isFounder ? (
                    <button
                      type="button"
                      onClick={() => deleteMemberCircle(circle.id)}
                      className="grid h-7 w-7 shrink-0 place-items-center border border-[#ff3b3b] text-xs font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                      aria-label={`Delete ${circle.name}`}
                      title="Delete group"
                    >
                      x
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                  {circle.visibility} circle
                </p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                  {circle.joinMode === "invite"
                    ? "invite only"
                    : "anyone can join"}
                </p>
              </div>
            );
          })
        ) : (
          <p className="border-l-2 border-[#39ff14] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
            empty
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsCreateCircleOpen((isOpen) => !isOpen)}
        className="mt-5 border-2 border-[#39ff14] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        create new circle
      </button>

      {isCreateCircleOpen ? (
        <form
          onSubmit={submitCircle}
          className="mt-5 border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.22)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            create new circle
          </p>
          <div className="mt-5 grid max-w-xl gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                Circle name
              </span>
              <input
                type="text"
                value={circleName}
                onChange={(event) =>
                  setCircleName(event.target.value.slice(0, 64))
                }
                className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
              />
            </label>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                Circle access
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["private", "public"] as CircleVisibility[]).map(
                  (visibility) => (
                    <button
                      key={visibility}
                      type="button"
                      onClick={() => setCircleVisibility(visibility)}
                      className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                        circleVisibility === visibility
                          ? "border-[#39ff14] bg-[#39ff14] text-black"
                          : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14]"
                      }`}
                    >
                      {visibility}
                    </button>
                  ),
                )}
              </div>
            </div>

            {circleVisibility === "private" ? (
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                  Enter access code to join this circle
                </span>
                <input
                  type="text"
                  maxLength={12}
                  value={circleAccessCode}
                  onChange={(event) =>
                    setCircleAccessCode(event.target.value.slice(0, 12))
                  }
                  className="border border-[#7f6d12] bg-[#140f00] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#f5d76e] outline-none focus:ring-2 focus:ring-[#f5d76e]"
                />
              </label>
            ) : null}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                Join rules
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  { id: "invite", label: "invite only" },
                  { id: "anyone", label: "anyone can join" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      setCircleJoinMode(mode.id as CircleJoinMode)
                    }
                    className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                      circleJoinMode === mode.id
                        ? "border-[#39ff14] bg-[#39ff14] text-black"
                        : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14]"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                Group description
              </span>
              <textarea
                maxLength={150}
                value={groupDescription}
                onChange={(event) =>
                  setGroupDescription(event.target.value.slice(0, 150))
                }
                className="min-h-24 resize-y border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.08em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
              />
              <span className="text-right text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#7f9f78]">
                {groupDescription.length}/150
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                Circle theme
              </span>
              <input
                type="text"
                maxLength={150}
                value={circleTheme}
                onChange={(event) =>
                  setCircleTheme(event.target.value.slice(0, 150))
                }
                className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
              />
              <span className="text-right text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#7f9f78]">
                {circleTheme.length}/150
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                Circle logo
              </span>
              <select
                value={circleLogo}
                onChange={(event) => setCircleLogo(event.target.value)}
                className="w-fit border border-[#1d7f12] bg-[#001100] px-3 py-2 text-xl font-black text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
              >
                {circleLogoOptions.map((logo) => (
                  <option key={logo} value={logo}>
                    {logo}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!circleName.trim()}
              className="w-fit border-2 border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:border-[#1d7f12] disabled:text-[#1d7f12] disabled:hover:bg-black"
            >
              submit
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
