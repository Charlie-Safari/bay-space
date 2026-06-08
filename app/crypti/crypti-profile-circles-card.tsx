"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CryptiCircle,
  CryptiCircleMember,
  cryptiCircleStoreEvent,
  followCryptiPersonalCircle,
  isFollowingCryptiPersonalCircle,
  joinCryptiCircle,
  listCryptiCirclesCreatedBy,
} from "./crypti-circle-store";

type CryptiProfileCirclesCardProps = {
  activeMember: CryptiCircleMember | null;
  profileMember: CryptiCircleMember;
};

export default function CryptiProfileCirclesCard({
  activeMember,
  profileMember,
}: CryptiProfileCirclesCardProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [circles, setCircles] = useState<CryptiCircle[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileFollowed, setIsProfileFollowed] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [joinMessage, setJoinMessage] = useState("");

  const loadCircles = useCallback(async () => {
    const nextCircles = listCryptiCirclesCreatedBy(profileMember.member);

    await Promise.resolve();

    return {
      circles: nextCircles,
      isProfileFollowed: activeMember
        ? isFollowingCryptiPersonalCircle(
            profileMember.member,
            activeMember.member,
          )
        : false,
    };
  }, [activeMember, profileMember.member]);

  useEffect(() => {
    let isMounted = true;

    async function syncCircles() {
      const nextState = await loadCircles();

      if (!isMounted) {
        return;
      }

      setCircles(nextState.circles);
      setIsProfileFollowed(nextState.isProfileFollowed);
    }

    syncCircles();
    window.addEventListener("storage", syncCircles);
    window.addEventListener("bay-space-auth", syncCircles);
    window.addEventListener(cryptiCircleStoreEvent, syncCircles);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncCircles);
      window.removeEventListener("bay-space-auth", syncCircles);
      window.removeEventListener(cryptiCircleStoreEvent, syncCircles);
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

    followCryptiPersonalCircle(profileMember, activeMember);
    setIsProfileFollowed(true);
    setJoinMessage("+crypti profile followed");
  }

  function joinCircle(circle: CryptiCircle) {
    if (!activeMember) {
      setJoinMessage("sign in required");
      return;
    }

    const result = joinCryptiCircle(circle.id, activeMember);

    setJoinMessage(result.message);
  }

  const selectedCircle =
    circles.find((circle) => circle.id === selectedCircleId) ?? null;

  return (
    <details
      ref={detailsRef}
      open={isOpen}
      onToggle={(event) => {
        const nextIsOpen = event.currentTarget.open;

        setIsOpen(nextIsOpen);

        if (!nextIsOpen) {
          setSelectedCircleId("");
          setJoinMessage("");
        }
      }}
      className="group border-2 border-[#39ff14] bg-black px-4 py-5 shadow-[0_0_16px_rgba(57,255,20,0.14)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black uppercase tracking-[0.24em] text-[#d7ffd0] [&::-webkit-details-marker]:hidden">
        <span>Circles</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#39ff14] transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>

      {selectedCircle ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => {
              setSelectedCircleId("");
              setJoinMessage("");
            }}
            className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            back
          </button>
          <div className="mt-5 border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.22)]">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#39ff14]">
              {selectedCircle.circleLogo || "◎"}{" "}
              {selectedCircle.name}
              {selectedCircle.ownerMember === profileMember.member
                ? " (FOUNDER)"
                : ""}
            </p>
            <div className="mt-4 grid gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
              <p>Circle owner: {profileMember.name}</p>
              <p>
                Group Description:{" "}
                {selectedCircle.groupDescription || "empty"}
              </p>
              <div>
                <p className="text-[#7f9f78]">Affiliated tickers</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCircle.affiliatedTickers.length ? (
                    selectedCircle.affiliatedTickers.map((symbol) => (
                      <span
                        key={symbol}
                        className="border border-[#1d7f12] px-2 py-1 text-[#39ff14]"
                      >
                        {symbol}
                      </span>
                    ))
                  ) : (
                    <span>empty</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => joinCircle(selectedCircle)}
                className="w-fit border border-[#39ff14] px-3 py-2 text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              >
                Join +circle
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <button
            type="button"
            onClick={followProfile}
            disabled={!activeMember || activeMember.member === profileMember.member}
            className="w-full border border-[#39ff14] px-3 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:border-[#1d7f12] disabled:text-[#1d7f12] disabled:hover:bg-black"
          >
            {isProfileFollowed
              ? "+crypti profile followed"
              : "Follow +Crypti Profile"}
          </button>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
            +Crypti Circles
          </p>
          <div className="mt-3 grid gap-3">
            {circles.length ? (
              circles.map((circle) => (
                <div
                  key={circle.id}
                  className="border border-[#1d7f12] bg-[#001100] px-3 py-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCircleId(circle.id);
                      setJoinMessage("");
                    }}
                    className="block w-full text-left text-sm font-black uppercase tracking-[0.14em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    {circle.circleLogo || "◎"}{" "}
                    {circle.name}
                    {circle.ownerMember === profileMember.member
                      ? " (FOUNDER)"
                      : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => joinCircle(circle)}
                    className="mt-3 border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    Join +circle
                  </button>
                </div>
              ))
            ) : (
              <p className="border-l-2 border-[#39ff14] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
                empty
              </p>
            )}
          </div>
        </div>
      )}

      {joinMessage ? (
        <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
          {joinMessage}
        </p>
      ) : null}
    </details>
  );
}
