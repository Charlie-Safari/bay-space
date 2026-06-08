"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BayCircle,
  CircleMember,
  circleStoreEvent,
  followPersonalCircle,
  getActiveMember,
  isFollowingPersonalCircle,
  joinCircle,
  listCirclesCreatedBy,
} from "../../components/circle-store";

type PublicCirclesCardProps = {
  member: CircleMember;
};

export default function PublicCirclesCard({ member }: PublicCirclesCardProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [activeMember, setActiveMember] = useState<CircleMember | null>(null);
  const [circles, setCircles] = useState<BayCircle[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileFollowed, setIsProfileFollowed] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [accessCircleId, setAccessCircleId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [joinMessage, setJoinMessage] = useState("");

  const loadCircles = useCallback(async () => {
    const nextActiveMember = await getActiveMember();
    const nextCircles = listCirclesCreatedBy(member.member);

    return {
      activeMember: nextActiveMember
        ? { member: nextActiveMember.member, name: nextActiveMember.name }
        : null,
      circles: nextCircles,
      isProfileFollowed: nextActiveMember
        ? isFollowingPersonalCircle(member.member, nextActiveMember.member)
        : false,
    };
  }, [member.member]);

  useEffect(() => {
    let isMounted = true;

    async function syncMountedCircles() {
      const nextState = await loadCircles();

      if (!isMounted) {
        return;
      }

      setActiveMember(nextState.activeMember);
      setCircles(nextState.circles);
      setIsProfileFollowed(nextState.isProfileFollowed);
    }

    syncMountedCircles();
    window.addEventListener("storage", syncMountedCircles);
    window.addEventListener("bay-space-auth", syncMountedCircles);
    window.addEventListener(circleStoreEvent, syncMountedCircles);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncMountedCircles);
      window.removeEventListener("bay-space-auth", syncMountedCircles);
      window.removeEventListener(circleStoreEvent, syncMountedCircles);
    };
  }, [loadCircles]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        detailsRef.current &&
        !detailsRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSelectedCircleId("");
        setAccessCircleId("");
        setJoinMessage("");
      }
    }

    window.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isOpen]);

  function followProfile() {
    if (!activeMember) {
      setJoinMessage("sign in required");
      return;
    }

    followPersonalCircle(member, activeMember);
    setIsProfileFollowed(true);
    setJoinMessage("profile circle followed");
  }

  function followCircle(circle: BayCircle, code = "") {
    if (!activeMember) {
      setJoinMessage("sign in required");
      return;
    }

    const needsAccessCode =
      circle.visibility === "private" || circle.joinMode === "invite";

    if (needsAccessCode && accessCircleId !== circle.id) {
      setAccessCircleId(circle.id);
      setAccessCode("");
      setJoinMessage("");
      return;
    }

    const result = joinCircle(circle.id, activeMember, code);

    setJoinMessage(result.message);
    setAccessCircleId("");
    setAccessCode("");
  }

  const publicCircles = circles.filter(
    (circle) => circle.visibility === "public",
  );
  const privateCircles = circles.filter(
    (circle) => circle.visibility === "private",
  );
  const selectedCircle =
    circles.find((circle) => circle.id === selectedCircleId) ?? null;

  function renderCircleList(circleList: BayCircle[], locked: boolean) {
    if (!circleList.length) {
      return (
        <p className="border-l-2 border-[#39ff14] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
          empty
        </p>
      );
    }

    return (
      <div className="grid gap-3">
        {circleList.map((circle) => (
          <div
            key={circle.id}
            className={`border px-3 py-3 ${
              locked
                ? "border-[#7f6d12] bg-[#140f00]"
                : "border-[#1d7f12] bg-[#001100]"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedCircleId(circle.id);
                setAccessCircleId("");
                setJoinMessage("");
              }}
              className={`block w-full text-left text-sm font-black uppercase tracking-[0.14em] transition focus:outline-none focus:ring-2 ${
                locked
                  ? "text-[#f5d76e] hover:text-[#fff2a8] focus:ring-[#f5d76e]"
                  : "text-[#d7ffd0] hover:text-[#39ff14] focus:ring-[#d7ffd0]"
              }`}
            >
              {locked ? "🔒 " : ""}
              {circle.circleLogo ? `${circle.circleLogo} ` : ""}
              {circle.name}
              {circle.ownerMember === member.member ? " (FOUNDER)" : ""}
            </button>
            <button
              type="button"
              onClick={() => followCircle(circle)}
              className={`mt-3 border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 ${
                locked
                  ? "border-[#7f6d12] text-[#f5d76e] hover:bg-[#f5d76e] hover:text-black focus:ring-[#f5d76e]"
                  : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:ring-[#d7ffd0]"
              }`}
            >
              Join this circle
            </button>
            {accessCircleId === circle.id ? (
              <div className="mt-3 grid gap-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-[#f5d76e]">
                    Enter the code to unlock this circle
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
                  onClick={() => followCircle(circle, accessCode)}
                  className="w-fit border border-[#f5d76e] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f5d76e] transition hover:bg-[#f5d76e] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#f5d76e]"
                >
                  unlock
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <details
      ref={detailsRef}
      open={isOpen}
      onToggle={(event) => {
        const nextIsOpen = event.currentTarget.open;

        setIsOpen(nextIsOpen);

        if (!nextIsOpen) {
          setSelectedCircleId("");
          setAccessCircleId("");
          setJoinMessage("");
        }
      }}
      className="group w-full border-2 border-[#39ff14] bg-black shadow-[0_0_18px_rgba(57,255,20,0.18)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0] transition hover:bg-[#001100] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d7ffd0] [&::-webkit-details-marker]:hidden">
        <span>Circles</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#39ff14] transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="border-t border-[#1d7f12] p-4">
        {selectedCircle ? (
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedCircleId("");
                setAccessCircleId("");
                setJoinMessage("");
              }}
              className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              back
            </button>
            <div
              className={`mt-5 border-2 p-4 shadow-[0_0_18px_rgba(57,255,20,0.22)] ${
                selectedCircle.visibility === "private"
                  ? "border-[#f5d76e] bg-[#140f00]"
                  : "border-[#39ff14] bg-black"
              }`}
            >
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#39ff14]">
                {selectedCircle.visibility === "private" ? "🔒 " : ""}
                {selectedCircle.circleLogo
                  ? `${selectedCircle.circleLogo} `
                  : ""}
                {selectedCircle.name}
                {selectedCircle.ownerMember === member.member
                  ? " (FOUNDER)"
                  : ""}
              </p>
              <div className="mt-4 grid gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                <p>Circle owner: {member.name}</p>
                <p>Visibility: {selectedCircle.visibility}</p>
                <p>
                  Join mode:{" "}
                  {selectedCircle.joinMode === "invite"
                    ? "invite only"
                    : "anyone can join"}
                </p>
                <p>
                  Group Description:{" "}
                  {selectedCircle.groupDescription || "empty"}
                </p>
                <p>
                  Circle theme: {selectedCircle.circleTheme || "empty"}
                </p>
                <button
                  type="button"
                  onClick={() => followCircle(selectedCircle)}
                  className="w-fit border border-[#39ff14] px-3 py-2 text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  Join this circle
                </button>
                {accessCircleId === selectedCircle.id ? (
                  <label className="grid gap-2">
                    <span className="text-[#f5d76e]">
                      Enter the code to unlock this circle
                    </span>
                    <input
                      type="text"
                      maxLength={12}
                      value={accessCode}
                      onChange={(event) =>
                        setAccessCode(event.target.value.slice(0, 12))
                      }
                      className="border border-[#7f6d12] bg-black px-3 py-2 text-[#f5d76e] outline-none focus:ring-2 focus:ring-[#f5d76e]"
                    />
                    <button
                      type="button"
                      onClick={() => followCircle(selectedCircle, accessCode)}
                      className="w-fit border border-[#f5d76e] px-3 py-2 text-[#f5d76e] transition hover:bg-[#f5d76e] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#f5d76e]"
                    >
                      unlock
                    </button>
                  </label>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={followProfile}
              disabled={!activeMember || activeMember.member === member.member}
              className="w-full border border-[#39ff14] px-3 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:border-[#1d7f12] disabled:text-[#1d7f12] disabled:hover:bg-black"
            >
              {isProfileFollowed ? "profile circle followed" : "Follow this profile"}
            </button>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
              Public Circles
            </p>
            <div className="mt-3">{renderCircleList(publicCircles, false)}</div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#f5d76e]">
              🔒 Private Circles
            </p>
            <div className="mt-3">{renderCircleList(privateCircles, true)}</div>
          </>
        )}

        {joinMessage ? (
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
            {joinMessage}
          </p>
        ) : null}
      </div>
    </details>
  );
}
