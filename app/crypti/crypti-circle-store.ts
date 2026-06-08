"use client";

export const cryptiCircleStoreEvent = "bay-space-crypti-circles";

export type CryptiCircleMember = {
  member: string;
  name: string;
};

export type CryptiCircle = {
  affiliatedTickers: string[];
  circleLogo: string;
  createdAt: string;
  groupDescription: string;
  id: string;
  members: CryptiCircleMember[];
  name: string;
  ownerMember: string;
  ownerName: string;
};

type CryptiPersonalFollow = {
  createdAt: string;
  followerMember: string;
  followerName: string;
  profileMember: string;
  profileName: string;
};

type CryptiCircleState = {
  circles: CryptiCircle[];
  personalFollows: CryptiPersonalFollow[];
};

const cryptiCircleStorageKey = "bay-space-crypti-circles-v1";

function emptyCryptiCircleState(): CryptiCircleState {
  return { circles: [], personalFollows: [] };
}

function readCryptiCircleState() {
  try {
    const state = JSON.parse(
      window.localStorage.getItem(cryptiCircleStorageKey) ?? "null",
    ) as Partial<CryptiCircleState> | null;

    return {
      circles: Array.isArray(state?.circles)
        ? state.circles.map((circle) => ({
            ...circle,
            affiliatedTickers: Array.isArray(circle.affiliatedTickers)
              ? circle.affiliatedTickers
              : [],
            circleLogo:
              typeof circle.circleLogo === "string" ? circle.circleLogo : "◎",
            groupDescription:
              typeof circle.groupDescription === "string"
                ? circle.groupDescription
                : "",
          }))
        : [],
      personalFollows: Array.isArray(state?.personalFollows)
        ? state.personalFollows
        : [],
    };
  } catch {
    return emptyCryptiCircleState();
  }
}

function writeCryptiCircleState(state: CryptiCircleState) {
  window.localStorage.setItem(cryptiCircleStorageKey, JSON.stringify(state));
  window.dispatchEvent(new Event(cryptiCircleStoreEvent));
}

function normalizeCircleName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function getCircleId() {
  return `crypti-circle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listCryptiCircles() {
  return readCryptiCircleState().circles;
}

export function listCryptiCirclesCreatedBy(memberId: string) {
  return listCryptiCircles().filter((circle) => circle.ownerMember === memberId);
}

export function listCryptiCirclesForMember(memberId: string) {
  return listCryptiCircles().filter((circle) =>
    circle.members.some((member) => member.member === memberId),
  );
}

export function createCryptiCircle(input: {
  affiliatedTickers: string[];
  circleLogo: string;
  groupDescription: string;
  name: string;
  owner: CryptiCircleMember;
}) {
  const name = normalizeCircleName(input.name);

  if (!name || !input.owner.member) {
    return null;
  }

  const state = readCryptiCircleState();
  const circle: CryptiCircle = {
    affiliatedTickers: input.affiliatedTickers,
    circleLogo: input.circleLogo,
    createdAt: new Date().toISOString(),
    groupDescription: input.groupDescription.slice(0, 150),
    id: getCircleId(),
    members: [input.owner],
    name,
    ownerMember: input.owner.member,
    ownerName: input.owner.name,
  };

  writeCryptiCircleState({ ...state, circles: [...state.circles, circle] });

  return circle;
}

export function deleteCryptiCircle(circleId: string, ownerMember: string) {
  const state = readCryptiCircleState();
  const circle = state.circles.find((candidate) => candidate.id === circleId);

  if (!circle || circle.ownerMember !== ownerMember) {
    return false;
  }

  writeCryptiCircleState({
    ...state,
    circles: state.circles.filter((candidate) => candidate.id !== circleId),
  });

  return true;
}

export function joinCryptiCircle(circleId: string, member: CryptiCircleMember) {
  if (!member.member) {
    return { joined: false, message: "sign in required" };
  }

  const state = readCryptiCircleState();
  const circle = state.circles.find((candidate) => candidate.id === circleId);

  if (!circle) {
    return { joined: false, message: "circle not found" };
  }

  if (circle.members.some((candidate) => candidate.member === member.member)) {
    return { joined: true, message: "already in +circle" };
  }

  const nextCircle = {
    ...circle,
    members: [...circle.members, member],
  };

  writeCryptiCircleState({
    ...state,
    circles: state.circles.map((candidate) =>
      candidate.id === circleId ? nextCircle : candidate,
    ),
  });

  return { joined: true, message: "+circle joined" };
}

export function followCryptiPersonalCircle(
  profile: CryptiCircleMember,
  follower: CryptiCircleMember,
) {
  if (!profile.member || !follower.member || profile.member === follower.member) {
    return false;
  }

  const state = readCryptiCircleState();
  const exists = state.personalFollows.some(
    (follow) =>
      follow.followerMember === follower.member &&
      follow.profileMember === profile.member,
  );

  if (exists) {
    return true;
  }

  writeCryptiCircleState({
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

export function isFollowingCryptiPersonalCircle(
  profileMember: string,
  followerMember: string,
) {
  return readCryptiCircleState().personalFollows.some(
    (follow) =>
      follow.followerMember === followerMember &&
      follow.profileMember === profileMember,
  );
}

export function getMutualCryptiPersonalCircleConnections(memberId: string) {
  const follows = readCryptiCircleState().personalFollows;
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
