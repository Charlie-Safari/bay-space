"use client";

import styles from "./profile.module.css";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BayCircle,
  CircleMember,
  circleStoreEvent,
  followPersonalCircle,
  getActiveMember,
  isFollowingPersonalCircle,
  joinCircle,
  listCirclesForMember,
  listPersonalCircleFollowers,
  listPersonalCircleFollowing,
} from "../../components/circle-store";
import {
  favoriteStoreEvent,
  getFavoriteAuthorIdsForMember,
} from "../../components/favorite-store";

type PublicCirclesCardProps = {
  member: CircleMember;
};

type PublicCircleMember = CircleMember & {
  label?: string;
};

export default function PublicCirclesCard({ member }: PublicCirclesCardProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [activeMember, setActiveMember] = useState<CircleMember | null>(null);
  const [memberCircles, setMemberCircles] = useState<BayCircle[]>([]);
  const [followers, setFollowers] = useState<CircleMember[]>([]);
  const [following, setFollowing] = useState<CircleMember[]>([]);
  const [favoriteAuthors, setFavoriteAuthors] = useState<PublicCircleMember[]>(
    [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileFollowed, setIsProfileFollowed] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [accessCircleId, setAccessCircleId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [hasSyncedProfileControls, setHasSyncedProfileControls] =
    useState(false);
  const [joinMessage, setJoinMessage] = useState("");

  const loadCircles = useCallback(async () => {
    const nextActiveMember = await getActiveMember();
    const nextMemberCircles = listCirclesForMember(member.member);
    const nextFollowers = listPersonalCircleFollowers(member.member);
    const nextFollowing = listPersonalCircleFollowing(member.member);
    const knownMembers = [
      member,
      ...nextFollowers,
      ...nextFollowing,
      ...nextMemberCircles.flatMap((circle) => circle.members),
    ];
    const nextFavoriteAuthors = getFavoriteAuthorIdsForMember(member.member).map(
      (favoriteAuthorId) => {
        const knownMember = knownMembers.find(
          (candidate) => candidate.member === favoriteAuthorId,
        );

        return {
          member: favoriteAuthorId,
          name: knownMember?.name ?? favoriteAuthorId,
          label: knownMember ? "" : "member",
        };
      },
    );

    return {
      activeMember: nextActiveMember
        ? { member: nextActiveMember.member, name: nextActiveMember.name }
        : null,
      favoriteAuthors: nextFavoriteAuthors,
      followers: nextFollowers,
      following: nextFollowing,
      isProfileFollowed: nextActiveMember
        ? isFollowingPersonalCircle(member.member, nextActiveMember.member)
        : false,
      memberCircles: nextMemberCircles,
    };
  }, [member]);

  useEffect(() => {
    let isMounted = true;

    async function syncMountedCircles() {
      const nextState = await loadCircles();

      if (!isMounted) {
        return;
      }

      setActiveMember(nextState.activeMember);
      setMemberCircles(nextState.memberCircles);
      setFollowers(nextState.followers);
      setFollowing(nextState.following);
      setFavoriteAuthors(nextState.favoriteAuthors);
      setIsProfileFollowed(nextState.isProfileFollowed);
      setHasSyncedProfileControls(true);
    }

    syncMountedCircles();
    window.addEventListener("storage", syncMountedCircles);
    window.addEventListener("bay-space-auth", syncMountedCircles);
    window.addEventListener(circleStoreEvent, syncMountedCircles);
    window.addEventListener(favoriteStoreEvent, syncMountedCircles);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncMountedCircles);
      window.removeEventListener("bay-space-auth", syncMountedCircles);
      window.removeEventListener(circleStoreEvent, syncMountedCircles);
      window.removeEventListener(favoriteStoreEvent, syncMountedCircles);
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
    setJoinMessage("following");
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

  const publicCircles = memberCircles.filter(
    (circle) => circle.visibility === "public",
  );
  const privateCircles = memberCircles.filter(
    (circle) => circle.visibility === "private",
  );
  const selectedCircle =
    memberCircles.find((circle) => circle.id === selectedCircleId) ?? null;
  const isOwnProfile = activeMember?.member === member.member;
  const canViewSelectedCircle =
    selectedCircle?.visibility === "public" ||
    Boolean(
      activeMember &&
        selectedCircle?.members.some(
          (circleMember) => circleMember.member === activeMember.member,
        ),
    );

  function renderMemberList(memberList: PublicCircleMember[]) {
    if (!memberList.length) {
      return (
        <p className="border-l-2 border-[#72c16a] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#dce9d9]">
          empty
        </p>
      );
    }

    return (
      <div className="grid gap-2">
        {memberList.map((listMember) => (
          <Link
            key={listMember.member}
            href={`/profile/${listMember.member}`}
            className="rounded-xl border border-[#365d36] bg-[#09150c] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#72c16a] transition hover:border-[#72c16a] hover:bg-[#72c16a]/15 hover:text-[#dce9d9] focus:outline-none focus:ring-2 focus:ring-[#dce9d9]"
          >
            {listMember.name}
            {listMember.label ? ` (${listMember.label})` : ""}
          </Link>
        ))}
      </div>
    );
  }

  function renderCircleList(circleList: BayCircle[], locked: boolean) {
    if (!circleList.length) {
      return (
        <p className="border-l-2 border-[#72c16a] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#dce9d9]">
          empty
        </p>
      );
    }

    return (
      <div className="grid gap-3">
        {circleList.map((circle) => (
          <div
            key={circle.id}
            className={`rounded-xl border px-3 py-3 ${
              locked
                ? "border-[#7f6d12] bg-[#140f00]"
                : "border-[#365d36] bg-[#09150c]"
            }`}
          >
            {locked ? (
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#f5d76e]">
                🔒 {circle.circleLogo ? `${circle.circleLogo} ` : ""}
                {circle.name}
                {circle.ownerMember === member.member ? " (FOUNDER)" : ""}
              </p>
            ) : (
              <Link
                href={`/circles/${encodeURIComponent(circle.id)}`}
                className="block w-full text-left text-sm font-black uppercase tracking-[0.14em] text-[#dce9d9] transition hover:text-[#72c16a] focus:outline-none focus:ring-2 focus:ring-[#dce9d9]"
              >
                {circle.circleLogo ? `${circle.circleLogo} ` : ""}
                {circle.name}
                {circle.ownerMember === member.member ? " (FOUNDER)" : ""}
              </Link>
            )}
            <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#9abc96]">
              {circle.ownerName} / {circle.visibility} circle
            </p>
            {locked ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCircleId(circle.id);
                  setAccessCircleId("");
                  setJoinMessage("");
                }}
                className="mt-3 rounded-full border border-[#7f6d12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f5d76e] transition hover:bg-[#f5d76e] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#f5d76e]"
              >
                Open private circle
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => followCircle(circle)}
              className={`mt-3 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 ${
                locked
                  ? "border-[#7f6d12] text-[#f5d76e] hover:bg-[#f5d76e] hover:text-black focus:ring-[#f5d76e]"
                  : "border-[#365d36] text-[#72c16a] hover:border-[#72c16a] hover:bg-[#72c16a]/15 hover:text-[#dce9d9] focus:ring-[#dce9d9]"
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
                    className="rounded-xl border border-[#7f6d12] bg-black px-3 py-2 text-sm font-black tracking-[0.12em] text-[#f5d76e] outline-none focus:ring-2 focus:ring-[#f5d76e]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => followCircle(circle, accessCode)}
                  className="w-fit rounded-full border border-[#f5d76e] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f5d76e] transition hover:bg-[#f5d76e] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#f5d76e]"
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

  function renderDropdown(
    title: string,
    content: ReactNode,
    tone: "green" | "gold" = "green",
  ) {
    const isGold = tone === "gold";

    return (
      <details
        className={`rounded-xl border px-3 py-3 ${
          isGold ? "border-[#7f6d12] bg-[#140f00]" : "border-[#365d36] bg-black"
        }`}
      >
        <summary
          className={`cursor-pointer list-none text-xs font-black uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 [&::-webkit-details-marker]:hidden ${
            isGold
              ? "text-[#f5d76e] hover:text-[#fff2a8] focus:ring-[#f5d76e]"
              : "text-[#dce9d9] hover:text-[#72c16a] focus:ring-[#dce9d9]"
          }`}
        >
          {title}
        </summary>
        <div className="mt-3">{content}</div>
      </details>
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
      className={styles.disclosure}
    >
      <summary className={styles.summary}>
        <span>Circles</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#72c16a] transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className={styles.disclosureBody}>
        {selectedCircle ? (
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedCircleId("");
                setAccessCircleId("");
                setJoinMessage("");
              }}
              className="rounded-xl border border-[#365d36] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#72c16a] transition hover:border-[#72c16a] hover:bg-[#72c16a]/15 hover:text-[#dce9d9] focus:outline-none focus:ring-2 focus:ring-[#dce9d9]"
            >
              back
            </button>
            <div
              className={`mt-5 rounded-xl border p-4 shadow-[0_0_18px_rgba(114,193,106,0.22)] ${
                selectedCircle.visibility === "private"
                  ? "border-[#f5d76e] bg-[#140f00]"
                  : "border-[#72c16a] bg-black"
              }`}
            >
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#72c16a]">
                {selectedCircle.visibility === "private" ? "🔒 " : ""}
                {selectedCircle.circleLogo
                  ? `${selectedCircle.circleLogo} `
                  : ""}
                {selectedCircle.name}
                {selectedCircle.ownerMember === member.member
                  ? " (FOUNDER)"
                  : ""}
              </p>
              <div className="mt-4 grid gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#dce9d9]">
                {canViewSelectedCircle ? (
                  <>
                    <p>Circle owner: {selectedCircle.ownerName}</p>
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
                  </>
                ) : (
                  <p className="border-l-2 border-[#f5d76e] pl-3 text-[#f5d76e]">
                    Private circle access requires accepted membership.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => followCircle(selectedCircle)}
                  className="w-fit rounded-full border border-[#72c16a] px-3 py-2 text-[#72c16a] transition hover:bg-[#72c16a]/15 hover:text-[#dce9d9] focus:outline-none focus:ring-2 focus:ring-[#dce9d9]"
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
                      className="rounded-xl border border-[#7f6d12] bg-black px-3 py-2 text-[#f5d76e] outline-none focus:ring-2 focus:ring-[#f5d76e]"
                    />
                    <button
                      type="button"
                      onClick={() => followCircle(selectedCircle, accessCode)}
                      className="w-fit rounded-full border border-[#f5d76e] px-3 py-2 text-[#f5d76e] transition hover:bg-[#f5d76e] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#f5d76e]"
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
            {hasSyncedProfileControls && !isOwnProfile ? (
              <button
                type="button"
                onClick={followProfile}
                disabled={isProfileFollowed}
                className={`w-full rounded-xl border px-3 py-3 text-left text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 focus:ring-[#dce9d9] ${
                  isProfileFollowed
                    ? "border-[#72c16a] bg-[#72c16a] text-black"
                    : "border-[#72c16a] text-[#72c16a] hover:bg-[#72c16a]/15 hover:text-[#dce9d9] disabled:border-[#365d36] disabled:text-[#365d36] disabled:hover:bg-black"
                }`}
              >
                {isProfileFollowed ? "Following" : "Follow this user"}
              </button>
            ) : null}

            <div className="mt-5 grid gap-3">
              {renderDropdown(
                "Public Circles",
                renderCircleList(publicCircles, false),
              )}
              {renderDropdown(
                "Private Circles",
                renderCircleList(privateCircles, true),
                "gold",
              )}
              {renderDropdown("Followers", renderMemberList(followers))}
              {renderDropdown("Following", renderMemberList(following))}
              {renderDropdown(
                "Favorite Authors",
                renderMemberList(favoriteAuthors),
              )}
            </div>
          </>
        )}

        {joinMessage ? (
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#dce9d9]">
            {joinMessage}
          </p>
        ) : null}
      </div>
    </details>
  );
}
