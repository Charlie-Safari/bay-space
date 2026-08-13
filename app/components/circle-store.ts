"use client";

import { BayMember } from "../../lib/bay-space-types";

export const circleStoreEvent = "bay-space-circles";

export type CircleJoinMode = "anyone" | "invite";
export type CircleVisibility = "private" | "public";

export type CircleMember = {
  member: string;
  name: string;
};

export type BayCircle = {
  accessCode: string;
  circleLogo: string;
  circleTheme: string;
  createdAt: string;
  groupDescription: string;
  id: string;
  joinMode: CircleJoinMode;
  members: CircleMember[];
  name: string;
  ownerMember: string;
  ownerName: string;
  visibility: CircleVisibility;
};

type PersonalCircleFollow = {
  createdAt: string;
  followerMember: string;
  followerName: string;
  profileMember: string;
  profileName: string;
};

type CircleState = {
  circles: BayCircle[];
  personalFollows: PersonalCircleFollow[];
};

const circleStorageKey = "bay-space-circles-v1";

function emptyCircleState(): CircleState {
  return { circles: [], personalFollows: [] };
}

function readCircleState() {
  try {
    const state = JSON.parse(
      window.localStorage.getItem(circleStorageKey) ?? "null",
    ) as Partial<CircleState> | null;

    return {
      circles: Array.isArray(state?.circles) ? state.circles : [],
      personalFollows: Array.isArray(state?.personalFollows)
        ? state.personalFollows
        : [],
    };
  } catch {
    return emptyCircleState();
  }
}

function writeCircleState(state: CircleState) {
  window.localStorage.setItem(circleStorageKey, JSON.stringify(state));
  window.dispatchEvent(new Event(circleStoreEvent));
}

function normalizeCircleName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function getCircleId() {
  return `circle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getActiveMember() {
  const response = await fetch("/api/me", { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { member?: BayMember | null };

  return data.member ?? null;
}

export function listCircles() {
  return readCircleState().circles;
}

export function listCirclesCreatedBy(memberId: string) {
  return listCircles().filter((circle) => circle.ownerMember === memberId);
}

export function listCirclesForMember(memberId: string) {
  return listCircles().filter((circle) =>
    circle.members.some((member) => member.member === memberId),
  );
}

export function getCircle(circleId: string) {
  return listCircles().find((circle) => circle.id === circleId) ?? null;
}

export function createCircle(input: {
  accessCode: string;
  circleLogo: string;
  circleTheme: string;
  groupDescription: string;
  joinMode: CircleJoinMode;
  name: string;
  owner: CircleMember;
  visibility: CircleVisibility;
}) {
  const name = normalizeCircleName(input.name);

  if (!name) {
    return null;
  }

  const state = readCircleState();
  const circle: BayCircle = {
    accessCode: input.accessCode.slice(0, 12),
    circleLogo: input.circleLogo,
    circleTheme: input.circleTheme.slice(0, 150),
    createdAt: new Date().toISOString(),
    groupDescription: input.groupDescription.slice(0, 150),
    id: getCircleId(),
    joinMode: input.joinMode,
    members: [input.owner],
    name,
    ownerMember: input.owner.member,
    ownerName: input.owner.name,
    visibility: input.visibility,
  };

  writeCircleState({ ...state, circles: [...state.circles, circle] });

  return circle;
}

export function deleteCircle(circleId: string, ownerMember: string) {
  const state = readCircleState();
  const circle = state.circles.find((candidate) => candidate.id === circleId);

  if (!circle || circle.ownerMember !== ownerMember) {
    return false;
  }

  writeCircleState({
    ...state,
    circles: state.circles.filter((candidate) => candidate.id !== circleId),
  });

  return true;
}

export function joinCircle(
  circleId: string,
  member: CircleMember,
  accessCode = "",
) {
  const state = readCircleState();
  const circle = state.circles.find((candidate) => candidate.id === circleId);

  if (!circle) {
    return { joined: false, message: "circle not found" };
  }

  if (circle.members.some((candidate) => candidate.member === member.member)) {
    return { joined: true, message: "already in circle" };
  }

  const needsAccessCode =
    circle.visibility === "private" || circle.joinMode === "invite";

  if (needsAccessCode && circle.accessCode !== accessCode.slice(0, 12)) {
    return { joined: false, message: "access code required" };
  }

  const nextCircle = {
    ...circle,
    members: [...circle.members, member],
  };

  writeCircleState({
    ...state,
    circles: state.circles.map((candidate) =>
      candidate.id === circleId ? nextCircle : candidate,
    ),
  });

  return { joined: true, message: "circle joined" };
}

export function followPersonalCircle(
  profile: CircleMember,
  follower: CircleMember,
) {
  if (!profile.member || !follower.member || profile.member === follower.member) {
    return false;
  }

  const state = readCircleState();
  const exists = state.personalFollows.some(
    (follow) =>
      follow.followerMember === follower.member &&
      follow.profileMember === profile.member,
  );

  if (exists) {
    return true;
  }

  writeCircleState({
    ...state,
    personalFollows: [
      ...state.personalFollows,
      {
        createdAt: new Date().toISOString(),
        followerMember: follower.member,
        followerName: follower.name,
        profileMember: profile.member,
        profileName: profile.name,
      },
    ],
  });

  return true;
}

export function isFollowingPersonalCircle(
  profileMember: string,
  followerMember: string,
) {
  return readCircleState().personalFollows.some(
    (follow) =>
      follow.followerMember === followerMember &&
      follow.profileMember === profileMember,
  );
}

function uniqueCircleMembers(members: CircleMember[]) {
  const seenMembers = new Set<string>();

  return members.filter((member) => {
    if (seenMembers.has(member.member)) {
      return false;
    }

    seenMembers.add(member.member);
    return true;
  });
}

export function listPersonalCircleFollowers(profileMember: string) {
  return uniqueCircleMembers(
    readCircleState()
      .personalFollows.filter((follow) => follow.profileMember === profileMember)
      .map((follow) => ({
        member: follow.followerMember,
        name: follow.followerName,
      })),
  );
}

export function listPersonalCircleFollowing(followerMember: string) {
  return uniqueCircleMembers(
    readCircleState()
      .personalFollows.filter((follow) => follow.followerMember === followerMember)
      .map((follow) => ({
        member: follow.profileMember,
        name: follow.profileName,
      })),
  );
}

export function getMutualPersonalCircleConnections(memberId: string) {
  const follows = readCircleState().personalFollows;
  const outgoing = follows.filter((follow) => follow.followerMember === memberId);

  return outgoing
    .filter((follow) =>
      follows.some(
        (candidate) =>
          candidate.followerMember === follow.profileMember &&
          candidate.profileMember === memberId,
      ),
    )
    .map((follow) => ({
      member: follow.profileMember,
      name: follow.profileName,
    }));
}
