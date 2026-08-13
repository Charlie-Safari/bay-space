import { createHash, randomBytes } from "crypto";
import {
  SupabaseServerError,
  supabaseRequest,
} from "./supabase/server";
import {
  BayDirectConversation,
  BayDirectMessage,
  BayDirectMessageMember,
  BayMember,
  BayPost,
  BayPostComment,
  BayPostTruthVoteSummary,
  PublicLink,
} from "./bay-space-types";
import {
  bayoCoinExchangeRate,
  bayoCards,
  bayoTokenExchangeRate,
  bayoStamps,
  defaultMemberRole,
  defaultMemberTitle,
  doublayCardId,
  gateKeys,
  getBayoCardActiveSlotCount,
  getBayRankConfig,
  getCryptiRankForLifetimePoints,
  getPromotedBayRankForLifetimePoints,
  hasCryptiPromotionBranch,
  graduationCoinCost,
  isBayoCardId,
  isBayoStampId,
  isTokenGateKey,
  moneyPrinterICardId,
  moneyPrinterIICardId,
  moneyPrinterIIICardId,
  moneyPrinterIIntervalMs,
  moneyPrinterIIIntervalMs,
  moneyPrinterIIIIntervalMs,
  moneyPrinterIPointValue,
  moneyPrinterIIPointValue,
  moneyPrinterIIIPointValue,
  normalizeBayRank,
  type BayoCardId,
  type BayoStampId,
  type BayoTitleId,
  type CryptiRank,
  type GateKey,
} from "./bay-space-ranks";
import {
  articleReadPointValue,
  getPositiveInteger,
  getTruthVotePointValue,
  profileVisitPointValue,
} from "./bay-space-scoring";
import {
  isValidUsername,
  normalizeUsername,
} from "./bay-space-username";
import { cryptiAgreementVersion } from "./bay-space-agreement";
export { baySpaceAgreementVersion } from "./bay-space-agreement";

type BayPostCategory =
  | "top-story"
  | "daily-food"
  | "theory"
  | "library-submission";

type NewMemberInput = {
  name: string;
};

type UpdateMemberInput = {
  agreementAcceptedAt: string;
  agreementVersion: string;
  name: string;
  pin: string;
  refName: string;
  roles: string;
  title: string;
};

type NewPostInput = Omit<BayPost, "id" | "createdAt" | "dateKey">;

type MemberSettingsInput = {
  email?: string;
  birthdayMonth?: string;
  birthdayYear?: string;
  cryptiAgreementAccepted?: boolean;
  links?: {
    x?: PublicLink;
    linkedin?: PublicLink;
    github?: PublicLink;
    youtube?: PublicLink;
  };
};

const baySpaceWildCardAccessKey = "Welcome*";
const wildCardGateKeyReserve: GateKey[] = ["safari-nation", "crypti-plus"];
const wildCardGateKeyReservePoints =
  wildCardGateKeyReserve.reduce((totalCoins, gateKeyId) => {
    const gateKey = gateKeys.find((candidate) => candidate.id === gateKeyId);

    return totalCoins + (gateKey?.coinCost ?? 0);
  }, 0) * bayoCoinExchangeRate;
export const baySpaceWildCardPointAward = Math.max(
  100000,
  getBayRankConfig("graduation").minLifetimePoints +
    wildCardGateKeyReservePoints,
);
export const baySpaceWildCardPointFloor = baySpaceWildCardPointAward;
const instantRankPromotionGateKeyId: GateKey = "instant-rank-promotion";
const instantRankPromotionIIGateKeyId: GateKey = "instant-rank-promotion-ii";

type MemberStats = {
  profileVisits?: number;
};

type MemberCryptiStats = {
  profileVisits?: number;
};

type MemberMoneyPrinter = {
  activeIAt?: number;
  passiveIIAt?: number;
  passiveIIIAt?: number;
};

type MemberTicketVote = {
  nextAt?: number;
  postIds?: string[];
};

type MemberLinks = Partial<NonNullable<BayMember["links"]>> & {
  _activeBayoCards?: string[];
  _bayoCards?: string[];
  _bayoStamps?: string[];
  _bayoTokens?: number;
  _lifetimeBayoTokens?: number;
  _cryptiStats?: MemberCryptiStats;
  _moneyPrinter?: MemberMoneyPrinter;
  _stats?: MemberStats;
  _cryptiTicketVote?: MemberTicketVote;
  _ticketVote?: MemberTicketVote;
};

type MemberRow = {
  agreement_accepted_at: string | null;
  agreement_version: string;
  available_points?: number | null;
  bayo_coins?: number | null;
  birthday_month: string;
  birthday_year: string;
  created_at: string;
  crypti_agreement_accepted_at?: string | null;
  crypti_agreement_version?: string | null;
  crypti_rank?: string | null;
  deleted_at: string | null;
  email: string;
  gate_keys?: unknown;
  id: string;
  links: MemberLinks;
  lifetime_points?: number | null;
  member_number: number;
  name: string;
  purchased_titles?: unknown;
  rank?: string | null;
  ref_name: string;
  title: string;
  updated_at: string;
};

type AuthCredentialRow = {
  member_id: string;
  pin_hash: string;
  pin_salt: string;
};

type MemberRoleRow = {
  member_id: string;
  role: string;
};

type MemberArticleReadRow = {
  created_at: string;
  member_id: string;
  point_value: number;
  post_id: string;
};

type MemberSessionRow = {
  expires_at: string;
  id: string;
  member_id: string;
  revoked_at: string | null;
  token_hash: string;
};

type PostRow = {
  anonymous: boolean;
  author_member_id: string | null;
  author_member_number: number | null;
  body: string;
  category: BayPostCategory;
  created_at: string;
  date_key: string;
  deleted_at: string | null;
  id: string;
  incognito: boolean;
  meta: Record<string, string | string[]>;
  moderation_reason: string | null;
  moderation_status: string;
  shelf_code: string | null;
  shelf_label: string | null;
  title: string;
  updated_at: string;
};

type PostCommentRow = {
  author_member_id: string | null;
  author_member_number: number | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
  id: string;
  moderation_status: string;
  post_id: string;
  updated_at: string;
};

type PostTruthVoteRow = {
  created_at: string;
  member_id: string;
  point_value: number;
  post_id: string;
  score: number;
  updated_at: string;
};

type DirectMessageRow = {
  body: string;
  created_at: string;
  expires_at: string;
  id: string;
  read_at: string | null;
  recipient_member_id: string;
  sender_member_id: string;
};

type DirectMessageBlockRow = {
  blocked_member_id: string;
  blocker_member_id: string;
  created_at: string;
};

type SavedPostRow = {
  member_id: string;
  post_id: string;
};

export class BaySpaceStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BaySpaceStorageError";
  }
}

export class UsernameUnavailableError extends Error {
  constructor() {
    super("username unavailable");
    this.name = "UsernameUnavailableError";
  }
}

export function getStorageErrorMessage(error: unknown) {
  if (error instanceof BaySpaceStorageError) {
    return error.message;
  }

  if (error instanceof SupabaseServerError) {
    return error.message;
  }

  return null;
}

const firstMemberNumber = 33332;
const memberIdWidth = 5;
const sessionCookieName = "bay-space-session";
const sessionDays = 30;

export const baySpaceSessionCookieName = sessionCookieName;

function formatMemberId(value: number) {
  return value.toString().padStart(memberIdWidth, "0");
}

function normalizeMember(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, memberIdWidth)
    .padStart(memberIdWidth, "0");
}

function getMemberNumber(value: string) {
  const memberNumber = Number(normalizeMember(value));

  return Number.isFinite(memberNumber) ? memberNumber : firstMemberNumber;
}

function normalizeName(name: string) {
  return name.trim().slice(0, 24) || "explorer";
}

function normalizeRefName(refName: string) {
  return normalizeUsername(refName);
}

function normalizeTitle(title: string) {
  return title.trim().slice(0, 80) || defaultMemberTitle;
}

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDays);

  return expiresAt.toISOString();
}

function publicMember(member: MemberRow, roles: string[] = []): BayMember {
  return {
    activeBayoCards: getMemberActiveBayoCards(member),
    availablePoints: normalizePointBalance(member.available_points),
    bayoCards: getMemberBayoCards(member),
    bayoCoins: normalizePointBalance(member.bayo_coins),
    bayoStamps: getMemberBayoStamps(member),
    bayoTokens: getMemberBayoTokens(member),
    cryptiAgreementAcceptedAt:
      member.crypti_agreement_accepted_at ?? undefined,
    cryptiAgreementVersion: member.crypti_agreement_version ?? undefined,
    cryptiRank: normalizeCryptiRank(member.crypti_rank),
    gateKeys: normalizeStringArray<GateKey>(member.gate_keys),
    lifetimePoints: normalizePointBalance(member.lifetime_points),
    lifetimeTokens: getMemberLifetimeBayoTokens(member),
    member: formatMemberId(member.member_number),
    name: member.name,
    purchasedTitles: normalizeStringArray<BayoTitleId>(
      member.purchased_titles,
    ),
    rank: normalizeBayRank(member.rank),
    refName: member.ref_name,
    roles: roles.join(","),
    title: member.title,
    createdAt: member.created_at,
    email: member.email,
    birthdayMonth: member.birthday_month,
    birthdayYear: member.birthday_year,
    links: {
      _cryptiOwnedTickers: normalizeCryptiOwnedTickerSymbols(
        member.links?._cryptiOwnedTickers,
      ),
      x: normalizePublicLink(member.links?.x),
      linkedin: normalizePublicLink(member.links?.linkedin),
      github: normalizePublicLink(member.links?.github),
      youtube: normalizePublicLink(member.links?.youtube),
    },
  };
}

function publicPost(post: PostRow): BayPost {
  return {
    id: post.id,
    category: post.category,
    title: post.title,
    body: post.body,
    createdAt: post.created_at,
    dateKey: post.date_key,
    anonymous: post.anonymous,
    incognito: post.incognito,
    author: post.author_member_number
      ? formatMemberId(post.author_member_number)
      : "unknown",
    shelfLabel: post.shelf_label ?? undefined,
    shelfCode: post.shelf_code ?? undefined,
    meta: post.meta ?? {},
  };
}

function publicPostComment(
  comment: PostCommentRow,
  author?: MemberRow,
): BayPostComment {
  return {
    authorActiveCards: author ? getMemberActiveBayoCards(author) : [],
    author: comment.author_member_number
      ? formatMemberId(comment.author_member_number)
      : "unknown",
    authorName: author?.name ?? "",
    body: comment.body,
    createdAt: comment.created_at,
    id: comment.id,
  };
}

function publicDirectMessageMember(
  member: MemberRow,
): BayDirectMessageMember {
  return {
    member: formatMemberId(member.member_number),
    name: member.name,
    refName: member.ref_name,
    title: member.title,
  };
}

function getDirectMessageMemberNumber(
  memberId: string,
  membersById: Map<string, MemberRow>,
) {
  const member = membersById.get(memberId);

  return member ? formatMemberId(member.member_number) : "unknown";
}

function publicDirectMessage(
  message: DirectMessageRow,
  currentMemberId: string,
  membersById: Map<string, MemberRow>,
  readAtOverride?: string,
): BayDirectMessage {
  return {
    body: message.body,
    createdAt: message.created_at,
    expiresAt: message.expires_at,
    id: message.id,
    isMine: message.sender_member_id === currentMemberId,
    readAt: readAtOverride ?? message.read_at ?? undefined,
    recipientMember: getDirectMessageMemberNumber(
      message.recipient_member_id,
      membersById,
    ),
    senderMember: getDirectMessageMemberNumber(
      message.sender_member_id,
      membersById,
    ),
  };
}

function summarizeTruthVotes(
  votes: PostTruthVoteRow[],
  userMemberId?: string,
): BayPostTruthVoteSummary {
  const voteCount = votes.length;
  const scoreTotal = votes.reduce((total, vote) => total + vote.score, 0);
  const pointValue = votes.reduce(
    (total, vote) => total + getTruthVotePointValue(vote.score),
    0,
  );
  const userVote =
    userMemberId
      ? votes.find((vote) => vote.member_id === userMemberId)
      : undefined;

  return {
    averageScore: voteCount ? scoreTotal / voteCount : 0,
    pointValue,
    scoreTotal,
    userScore: userVote?.score ?? null,
    voteCount,
  };
}

function getPostTicketVoteCount(post: PostRow) {
  return getPositiveInteger(post.meta?.ticketVotes);
}

function getPostCryptiTicketVoteCount(post: PostRow) {
  return getPositiveInteger(post.meta?.cryptiTicketVotes);
}

function getPostVisitCount(post: PostRow) {
  return getPositiveInteger(post.meta?.postVisits);
}

function getPostShareLinkClickCount(post: PostRow) {
  return getPositiveInteger(post.meta?.shareLinkClicks);
}

function normalizePublicLink(link?: PublicLink) {
  return {
    url: link?.url.trim().slice(0, 240) ?? "",
    display: Boolean(link?.display),
  };
}

function normalizeCryptiOwnedTickerSymbols(symbols?: unknown) {
  return Array.isArray(symbols)
    ? Array.from(
        new Set(
          symbols
            .filter((symbol): symbol is string => typeof symbol === "string")
            .map((symbol) =>
              symbol
                .trim()
                .replace(/^\$/, "")
                .replace(/\s+/g, "")
                .toUpperCase()
                .slice(0, 12),
            )
            .filter(Boolean),
        ),
      )
    : [];
}

function normalizeStringArray<T extends string>(value: unknown) {
  return Array.isArray(value)
    ? Array.from(
        new Set(value.filter((item): item is T => typeof item === "string")),
      )
    : [];
}

function normalizePointBalance(value: unknown) {
  const points = Number(value);

  return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0;
}

function normalizeCryptiRank(rank: string | null | undefined): CryptiRank {
  return rank === "reader-iii" || rank === "poster-iv" || rank === "poster-v"
    ? rank
    : "";
}

function getMemberGateKeys(member: Pick<MemberRow, "gate_keys">) {
  return normalizeStringArray<GateKey>(member.gate_keys);
}

function getMemberBayoTokens(member: Pick<MemberRow, "links">) {
  return normalizePointBalance(member.links?._bayoTokens);
}

function getMemberLifetimeBayoTokens(member: Pick<MemberRow, "links">) {
  return Math.max(
    normalizePointBalance(member.links?._lifetimeBayoTokens),
    getMemberBayoTokens(member),
  );
}

function normalizeBayoCardArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (cardId): cardId is BayoCardId =>
              typeof cardId === "string" && isBayoCardId(cardId),
          ),
        ),
      )
    : [];
}

function getMemberBayoCards(member: Pick<MemberRow, "links">) {
  return normalizeBayoCardArray(member.links?._bayoCards);
}

function getMemberActiveBayoCards(member: Pick<MemberRow, "links">) {
  const ownedCards = getMemberBayoCards(member);
  const activeCards = normalizeBayoCardArray(
    member.links?._activeBayoCards,
  ).filter((cardId) => ownedCards.includes(cardId));
  const slotCount = getBayoCardActiveSlotCount(activeCards);

  if (activeCards.includes(doublayCardId)) {
    return [
      doublayCardId,
      ...activeCards.filter((cardId) => cardId !== doublayCardId),
    ].slice(0, slotCount);
  }

  return activeCards.slice(0, slotCount);
}

function normalizeBayoStampArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (stampId): stampId is BayoStampId =>
              typeof stampId === "string" && isBayoStampId(stampId),
          ),
        ),
      )
    : [];
}

function getMemberBayoStamps(member: Pick<MemberRow, "links">) {
  return normalizeBayoStampArray(member.links?._bayoStamps);
}

function normalizeMoneyPrinterTimestamp(value: unknown) {
  const timestamp = Number(value);

  return Number.isFinite(timestamp) && timestamp > 0
    ? Math.floor(timestamp)
    : 0;
}

function getMemberMoneyPrinter(member: Pick<MemberRow, "links">) {
  return {
    activeIAt: normalizeMoneyPrinterTimestamp(
      member.links?._moneyPrinter?.activeIAt,
    ),
    passiveIIAt: normalizeMoneyPrinterTimestamp(
      member.links?._moneyPrinter?.passiveIIAt,
    ),
    passiveIIIAt: normalizeMoneyPrinterTimestamp(
      member.links?._moneyPrinter?.passiveIIIAt,
    ),
  };
}

function getPromotedMemberCryptiRank(member: MemberRow, lifetimePoints: number) {
  const currentCryptiRank = normalizeCryptiRank(member.crypti_rank);
  const subject = {
    cryptiRank: currentCryptiRank,
    gateKeys: getMemberGateKeys(member),
    rank: member.rank ?? "",
  };

  return hasCryptiPromotionBranch(subject)
    ? getCryptiRankForLifetimePoints(lifetimePoints, currentCryptiRank)
    : currentCryptiRank;
}

function hasCryptiBranchOwnership(
  member: Pick<MemberRow, "crypti_rank" | "gate_keys">,
) {
  return (
    getMemberGateKeys(member).includes("crypti-plus") ||
    Boolean(normalizeCryptiRank(member.crypti_rank))
  );
}

async function canAcceptCryptiAgreement(member: MemberRow) {
  const memberRoles = await getMemberRoles(member.id);

  return (
    hasCryptiBranchOwnership(member) ||
    memberRoles.some((role) =>
      ["admin", "crypti", "crypti-plus"].includes(role),
    )
  );
}

function canPurchaseGateKey(
  gateKeyId: GateKey,
  gateKeyIds: GateKey[],
  member: MemberRow,
) {
  if (gateKeyId === instantRankPromotionGateKeyId) {
    return hasCryptiBranchOwnership(member);
  }

  if (gateKeyId === instantRankPromotionIIGateKeyId) {
    return (
      hasCryptiBranchOwnership(member) &&
      gateKeyIds.includes(instantRankPromotionGateKeyId)
    );
  }

  return true;
}

function getCryptiRankAfterGateKeyPurchase(
  gateKeyId: GateKey,
  member: MemberRow,
) {
  const lifetimePoints = normalizePointBalance(member.lifetime_points);
  const currentCryptiRank = normalizeCryptiRank(member.crypti_rank);

  if (gateKeyId === "crypti-plus") {
    return getCryptiRankForLifetimePoints(
      lifetimePoints,
      currentCryptiRank || "reader-iii",
    );
  }

  if (gateKeyId === instantRankPromotionGateKeyId) {
    return getCryptiRankForLifetimePoints(lifetimePoints, "poster-iv");
  }

  if (gateKeyId === instantRankPromotionIIGateKeyId) {
    return "poster-v";
  }

  return currentCryptiRank;
}

function getMemberPointAwardBody(member: MemberRow, points: number) {
  const availablePoints = normalizePointBalance(member.available_points) + points;
  const lifetimePoints = normalizePointBalance(member.lifetime_points) + points;

  return {
    available_points: availablePoints,
    crypti_rank: getPromotedMemberCryptiRank(member, lifetimePoints),
    lifetime_points: lifetimePoints,
    rank: getPromotedBayRankForLifetimePoints(lifetimePoints, member.rank),
  };
}

function getAccruedMoneyPrinterPoints(
  lastAt: number,
  now: number,
  intervalMs: number,
  pointsPerInterval: number,
) {
  if (!lastAt) {
    return {
      nextAt: now,
      points: 0,
    };
  }

  const intervals = Math.floor(Math.max(0, now - lastAt) / intervalMs);

  return {
    nextAt: intervals > 0 ? lastAt + intervals * intervalMs : lastAt,
    points: intervals * pointsPerInterval,
  };
}

async function syncMemberPassiveMoneyPrinter(member: MemberRow) {
  const activeCards = getMemberActiveBayoCards(member);
  const hasMoneyPrinterII = activeCards.includes(moneyPrinterIICardId);
  const hasMoneyPrinterIII = activeCards.includes(moneyPrinterIIICardId);

  if (!hasMoneyPrinterII && !hasMoneyPrinterIII) {
    return member;
  }

  const now = Date.now();
  const moneyPrinter = getMemberMoneyPrinter(member);
  const nextMoneyPrinter = { ...moneyPrinter };
  let points = 0;

  if (hasMoneyPrinterII) {
    const result = getAccruedMoneyPrinterPoints(
      moneyPrinter.passiveIIAt,
      now,
      moneyPrinterIIIntervalMs,
      moneyPrinterIIPointValue,
    );

    nextMoneyPrinter.passiveIIAt = result.nextAt;
    points += result.points;
  }

  if (hasMoneyPrinterIII) {
    const result = getAccruedMoneyPrinterPoints(
      moneyPrinter.passiveIIIAt,
      now,
      moneyPrinterIIIIntervalMs,
      moneyPrinterIIIPointValue,
    );

    nextMoneyPrinter.passiveIIIAt = result.nextAt;
    points += result.points;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      ...(points > 0 ? getMemberPointAwardBody(member, points) : {}),
      links: {
        ...(member.links ?? {}),
        _moneyPrinter: nextMoneyPrinter,
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      id: `eq.${member.id}`,
      select: "*",
    },
  });

  return rows[0] ?? member;
}

function getTruthVoteCardMultiplier(member: MemberRow, post: PostRow) {
  const activeCards = getMemberActiveBayoCards(member);

  if (activeCards.includes("empath-card") && post.category === "theory") {
    return 2;
  }

  if (
    activeCards.includes("hero-card") &&
    (post.category === "daily-food" || post.category === "top-story")
  ) {
    return 2;
  }

  return 1;
}

function normalizeProfileVisitCount(value: unknown) {
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function getMemberProfileVisits(member: MemberRow) {
  return normalizeProfileVisitCount(member.links?._stats?.profileVisits);
}

function getMemberCryptiProfileVisits(member: MemberRow) {
  return normalizeProfileVisitCount(
    member.links?._cryptiStats?.profileVisits,
  );
}

function normalizeTicketVoteNextAt(value: unknown) {
  const nextAt = Number(value);

  return Number.isFinite(nextAt) && nextAt > 0 ? Math.floor(nextAt) : 0;
}

function getMemberTicketVoteNextAtFromRow(member: MemberRow) {
  return normalizeTicketVoteNextAt(member.links?._ticketVote?.nextAt);
}

function getMemberCryptiTicketVoteNextAtFromRow(member: MemberRow) {
  return normalizeTicketVoteNextAt(member.links?._cryptiTicketVote?.nextAt);
}

function getMemberTicketedPostIds(member: MemberRow) {
  const postIds = member.links?._ticketVote?.postIds;

  return Array.isArray(postIds)
    ? postIds.filter((postId): postId is string => typeof postId === "string")
    : [];
}

function getMemberCryptiTicketedPostIds(member: MemberRow) {
  const postIds = member.links?._cryptiTicketVote?.postIds;

  return Array.isArray(postIds)
    ? postIds.filter((postId): postId is string => typeof postId === "string")
    : [];
}

function splitRoles(roles: string) {
  return roles
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

async function getMemberRoles(memberId: string) {
  const rows = await supabaseRequest<MemberRoleRow[]>("member_roles", {
    query: {
      member_id: `eq.${memberId}`,
      order: "created_at.asc",
      select: "role",
    },
  });

  return rows.map((row) => row.role);
}

async function setMemberRoles(memberId: string, roles: string) {
  await supabaseRequest<null>("member_roles", {
    method: "DELETE",
    query: { member_id: `eq.${memberId}` },
  });

  const nextRoles = splitRoles(roles);

  if (!nextRoles.length) {
    return;
  }

  await supabaseRequest<MemberRoleRow[]>("member_roles", {
    body: nextRoles.map((role) => ({ member_id: memberId, role })),
    method: "POST",
    prefer: "return=minimal",
  });
}

async function getMemberRowByNumber(memberId: string) {
  const rows = await supabaseRequest<MemberRow[]>("members", {
    query: {
      deleted_at: "is.null",
      member_number: `eq.${getMemberNumber(memberId)}`,
      select: "*",
    },
  });

  return rows[0] ?? null;
}

async function getMemberRowById(memberId: string) {
  const rows = await supabaseRequest<MemberRow[]>("members", {
    query: {
      deleted_at: "is.null",
      id: `eq.${memberId}`,
      select: "*",
    },
  });

  return rows[0] ?? null;
}

function isRefNameUniqueViolation(error: unknown) {
  return /members_ref_name_unique_idx/i.test(
    error instanceof Error ? error.message : String(error),
  );
}

function isMemberNumberUniqueViolation(error: unknown) {
  return /members_member_number/i.test(
    error instanceof Error ? error.message : String(error),
  );
}

function isMemberArticleReadUniqueViolation(error: unknown) {
  return (
    error instanceof SupabaseServerError &&
    (error.status === 409 ||
      /member_article_reads_pkey|duplicate key/i.test(error.message))
  );
}

export async function isRefNameAvailable(refName: string) {
  const candidateRefName = refName.trim();

  if (!isValidUsername(candidateRefName)) {
    return false;
  }

  const normalizedRefName = normalizeRefName(candidateRefName);

  const rows = await supabaseRequest<Array<{ id: string }>>("members", {
    query: {
      deleted_at: "is.null",
      limit: 1,
      ref_name: `ilike.${normalizedRefName}`,
      select: "id",
    },
  });

  return rows.length === 0;
}

async function getCredential(memberId: string) {
  const rows = await supabaseRequest<AuthCredentialRow[]>("auth_credentials", {
    query: {
      member_id: `eq.${memberId}`,
      select: "*",
    },
  });

  return rows[0] ?? null;
}

async function getPublicMemberFromRow(member: MemberRow) {
  return publicMember(member, await getMemberRoles(member.id));
}

async function getMemberRowBySessionToken(token: string) {
  if (!token) {
    return null;
  }

  const sessions = await supabaseRequest<MemberSessionRow[]>("member_sessions", {
    query: {
      expires_at: `gt.${new Date().toISOString()}`,
      revoked_at: "is.null",
      select: "*",
      token_hash: `eq.${hashToken(token)}`,
    },
  });
  const session = sessions[0];

  if (!session) {
    return null;
  }

  return getMemberRowById(session.member_id);
}

export async function createMember(input: NewMemberInput) {
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: { name: normalizeName(input.name) },
    method: "POST",
    prefer: "return=representation",
    query: { select: "*" },
  });

  return getPublicMemberFromRow(rows[0]);
}

export async function getNextMemberId() {
  const rows = await supabaseRequest<Array<{ member_number: number }>>(
    "members",
    {
      query: {
        limit: 1,
        order: "member_number.desc",
        select: "member_number",
      },
    },
  );
  const highestMember = rows[0]?.member_number;

  return formatMemberId(
    highestMember === undefined
      ? firstMemberNumber
      : Math.max(highestMember + 1, firstMemberNumber),
  );
}

export async function getMember(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member
    ? getPublicMemberFromRow(await syncMemberPassiveMoneyPrinter(member))
    : null;
}

export async function getMemberByUsername(username: string) {
  const candidateUsername = username.trim();

  if (!isValidUsername(candidateUsername)) {
    return null;
  }

  const normalizedUsername = normalizeRefName(candidateUsername);
  const rows = await supabaseRequest<MemberRow[]>("members", {
    query: {
      deleted_at: "is.null",
      limit: 1,
      or: `(ref_name.ilike.${normalizedUsername},name.ilike.${normalizedUsername})`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function listMembers() {
  const members = await supabaseRequest<MemberRow[]>("members", {
    query: {
      deleted_at: "is.null",
      order: "member_number.asc",
      select: "*",
    },
  });

  return Promise.all(members.map(getPublicMemberFromRow));
}

export async function countMemberBayoStamps() {
  const members = await supabaseRequest<Array<{ links: MemberLinks }>>(
    "members",
    {
      query: {
        deleted_at: "is.null",
        select: "links",
      },
    },
  );
  const counts = bayoStamps.reduce<Record<BayoStampId, number>>(
    (stampCounts, stamp) => {
      stampCounts[stamp.id] = 0;
      return stampCounts;
    },
    {} as Record<BayoStampId, number>,
  );

  members.forEach((member) => {
    getMemberBayoStamps({ links: member.links }).forEach((stampId) => {
      counts[stampId] += 1;
    });
  });

  return counts;
}

export async function completeMember(
  memberId: string,
  input: UpdateMemberInput,
) {
  const candidateRefName = input.refName.trim();

  if (
    !isValidUsername(candidateRefName) ||
    !(await isRefNameAvailable(candidateRefName))
  ) {
    throw new UsernameUnavailableError();
  }

  const refName = normalizeRefName(candidateRefName);

  const pinSalt = randomBytes(16).toString("hex");
  let members: MemberRow[];

  async function insertMember(memberNumber?: number) {
    return supabaseRequest<MemberRow[]>("members", {
      body: {
        agreement_accepted_at: input.agreementAcceptedAt,
        agreement_version: input.agreementVersion,
        ...(memberNumber ? { member_number: memberNumber } : {}),
        name: normalizeName(input.name),
        ref_name: refName,
        title: normalizeTitle(input.title || input.name),
      },
      method: "POST",
      prefer: "return=representation",
      query: { select: "*" },
    });
  }

  try {
    members = await insertMember(getMemberNumber(memberId));
  } catch (error) {
    if (isRefNameUniqueViolation(error)) {
      throw new UsernameUnavailableError();
    }

    if (!isMemberNumberUniqueViolation(error)) {
      throw error;
    }

    try {
      members = await insertMember(getMemberNumber(await getNextMemberId()));
    } catch (retryError) {
      if (isRefNameUniqueViolation(retryError)) {
        throw new UsernameUnavailableError();
      }

      throw retryError;
    }
  }
  const member = members[0];

  await supabaseRequest<AuthCredentialRow[]>("auth_credentials", {
    body: {
      member_id: member.id,
      pin_hash: hashPin(input.pin, pinSalt),
      pin_salt: pinSalt,
    },
    method: "POST",
    prefer: "return=minimal",
  });
  await setMemberRoles(member.id, defaultMemberRole);

  return getPublicMemberFromRow(member);
}

export async function changeMemberPin(memberId: string, pin: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const pinSalt = randomBytes(16).toString("hex");
  const rows = await supabaseRequest<AuthCredentialRow[]>("auth_credentials", {
    body: {
      pin_hash: hashPin(pin, pinSalt),
      pin_salt: pinSalt,
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_id: `eq.${member.id}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(member) : null;
}

export async function updateMemberTitle(memberId: string, title: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      title: normalizeTitle(title || member.name),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function updateMemberReferenceName(
  memberId: string,
  refName: string,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const candidateRefName = refName.trim() || member.name;

  if (!isValidUsername(candidateRefName)) {
    throw new UsernameUnavailableError();
  }

  const normalizedRefName = normalizeRefName(candidateRefName);
  const existingRows = await supabaseRequest<Array<{ id: string }>>("members", {
    query: {
      deleted_at: "is.null",
      limit: 1,
      ref_name: `ilike.${normalizedRefName}`,
      select: "id",
    },
  });
  const existingMember = existingRows[0] ?? null;

  if (existingMember && existingMember.id !== member.id) {
    throw new UsernameUnavailableError();
  }

  try {
    const rows = await supabaseRequest<MemberRow[]>("members", {
      body: {
        ref_name: normalizedRefName,
        updated_at: new Date().toISOString(),
      },
      method: "PATCH",
      prefer: "return=representation",
      query: {
        member_number: `eq.${member.member_number}`,
        select: "*",
      },
    });

    return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
  } catch (error) {
    if (isRefNameUniqueViolation(error)) {
      throw new UsernameUnavailableError();
    }

    throw error;
  }
}

export async function updateMemberSettings(
  memberId: string,
  input: MemberSettingsInput,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const hasAcceptedCurrentCryptiAgreement =
    Boolean(member.crypti_agreement_accepted_at) &&
    member.crypti_agreement_version === cryptiAgreementVersion;
  const shouldAcceptCryptiAgreement =
    input.cryptiAgreementAccepted === true &&
    (await canAcceptCryptiAgreement(member)) &&
    !hasAcceptedCurrentCryptiAgreement;

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      birthday_month: input.birthdayMonth?.trim().slice(0, 2) ?? "",
      birthday_year: input.birthdayYear?.trim().slice(0, 4) ?? "",
      ...(shouldAcceptCryptiAgreement
        ? {
            crypti_agreement_accepted_at: new Date().toISOString(),
            crypti_agreement_version: cryptiAgreementVersion,
          }
        : {}),
      email: input.email?.trim().slice(0, 120) ?? "",
      links: {
        ...(member.links ?? {}),
        _stats: member.links?._stats ?? {},
        _cryptiOwnedTickers: normalizeCryptiOwnedTickerSymbols(
          member.links?._cryptiOwnedTickers,
        ),
        _cryptiTicketVote: member.links?._cryptiTicketVote ?? {},
        _ticketVote: member.links?._ticketVote ?? {},
        x: normalizePublicLink(input.links?.x),
        linkedin: normalizePublicLink(input.links?.linkedin),
        github: normalizePublicLink(input.links?.github),
        youtube: normalizePublicLink(input.links?.youtube),
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function acceptMemberCryptiAgreement(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const hasAcceptedCurrentCryptiAgreement =
    Boolean(member.crypti_agreement_accepted_at) &&
    member.crypti_agreement_version === cryptiAgreementVersion;

  if (hasAcceptedCurrentCryptiAgreement) {
    return getPublicMemberFromRow(member);
  }

  if (!(await canAcceptCryptiAgreement(member))) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      crypti_agreement_accepted_at: new Date().toISOString(),
      crypti_agreement_version: cryptiAgreementVersion,
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export function isBaySpaceWildCardAccessKey(accessKey: string) {
  return accessKey.trim() === baySpaceWildCardAccessKey;
}

function getWildCardTitle(member: MemberRow) {
  const currentTitle = member.title.trim();

  if (
    !currentTitle ||
    currentTitle === "Curious Reader" ||
    currentTitle === defaultMemberTitle
  ) {
    return "Graduation";
  }

  return member.title;
}

export async function applyMemberWildCard(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const availablePoints =
    normalizePointBalance(member.available_points) +
    baySpaceWildCardPointAward;
  const lifetimePoints =
    normalizePointBalance(member.lifetime_points) +
    baySpaceWildCardPointAward;

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      available_points: availablePoints,
      lifetime_points: lifetimePoints,
      crypti_rank: getPromotedMemberCryptiRank(member, lifetimePoints),
      rank: getPromotedBayRankForLifetimePoints(lifetimePoints, member.rank),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function exchangeMemberPointsForCoins(
  memberId: string,
  points: number,
) {
  const member = await getMemberRowByNumber(memberId);
  const normalizedPoints = Math.floor(points);

  if (!member || normalizedPoints < bayoCoinExchangeRate) {
    return null;
  }

  const availablePoints = normalizePointBalance(member.available_points);
  const spendablePoints =
    Math.floor(normalizedPoints / bayoCoinExchangeRate) * bayoCoinExchangeRate;

  if (spendablePoints > availablePoints) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      available_points: availablePoints - spendablePoints,
      bayo_coins:
        normalizePointBalance(member.bayo_coins) +
        spendablePoints / bayoCoinExchangeRate,
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function exchangeMemberCoinsForTokens(
  memberId: string,
  coins: number,
) {
  const member = await getMemberRowByNumber(memberId);
  const normalizedCoins = Math.floor(coins);

  if (!member || normalizedCoins < bayoTokenExchangeRate) {
    return null;
  }

  const bayoCoins = normalizePointBalance(member.bayo_coins);
  const spendableCoins =
    Math.floor(normalizedCoins / bayoTokenExchangeRate) * bayoTokenExchangeRate;

  if (spendableCoins > bayoCoins) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      bayo_coins: bayoCoins - spendableCoins,
      links: {
        ...(member.links ?? {}),
        _bayoTokens:
          getMemberBayoTokens(member) + spendableCoins / bayoTokenExchangeRate,
        _lifetimeBayoTokens:
          getMemberLifetimeBayoTokens(member) +
          spendableCoins / bayoTokenExchangeRate,
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function purchaseMemberGraduation(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  if (normalizeBayRank(member.rank) === "graduation") {
    return getPublicMemberFromRow(member);
  }

  const bayoCoins = normalizePointBalance(member.bayo_coins);

  if (bayoCoins < graduationCoinCost) {
    return null;
  }

  const graduatedMember = { ...member, rank: "graduation" };
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      bayo_coins: bayoCoins - graduationCoinCost,
      crypti_rank: getPromotedMemberCryptiRank(
        graduatedMember,
        normalizePointBalance(member.lifetime_points),
      ),
      rank: "graduation",
      title: getWildCardTitle(member),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function purchaseMemberGateKey(
  memberId: string,
  gateKeyId: GateKey,
) {
  const member = await getMemberRowByNumber(memberId);
  const gateKey = gateKeys.find((candidate) => candidate.id === gateKeyId);

  if (!member || !gateKey || normalizeBayRank(member.rank) !== "graduation") {
    return null;
  }

  const gateKeyIds = getMemberGateKeys(member);

  if (gateKeyIds.includes(gateKey.id)) {
    return getPublicMemberFromRow(member);
  }

  if (!canPurchaseGateKey(gateKey.id, gateKeyIds, member)) {
    return null;
  }

  const usesTokens = isTokenGateKey(gateKey.id);
  const bayoCoins = normalizePointBalance(member.bayo_coins);
  const bayoTokens = getMemberBayoTokens(member);

  if ((usesTokens ? bayoTokens : bayoCoins) < gateKey.coinCost) {
    return null;
  }

  const nextGateKeyIds = [...gateKeyIds, gateKey.id];
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      ...(usesTokens
        ? {
            links: {
              ...(member.links ?? {}),
              _bayoTokens: bayoTokens - gateKey.coinCost,
            },
          }
        : { bayo_coins: bayoCoins - gateKey.coinCost }),
      crypti_rank: getCryptiRankAfterGateKeyPurchase(gateKey.id, member),
      gate_keys: nextGateKeyIds,
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function purchaseMemberBayoCard(
  memberId: string,
  cardId: BayoCardId,
) {
  const member = await getMemberRowByNumber(memberId);
  const card = bayoCards.find((candidate) => candidate.id === cardId);

  if (!member || !card || normalizeBayRank(member.rank) !== "graduation") {
    return null;
  }

  const syncedMember = await syncMemberPassiveMoneyPrinter(member);
  const ownedCards = getMemberBayoCards(syncedMember);

  if (ownedCards.includes(card.id)) {
    return getPublicMemberFromRow(syncedMember);
  }

  const bayoTokens = getMemberBayoTokens(syncedMember);

  if (bayoTokens < card.tokenCost) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(syncedMember.links ?? {}),
        _bayoCards: [...ownedCards, card.id],
        _bayoTokens: bayoTokens - card.tokenCost,
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${syncedMember.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function toggleMemberBayoCard(
  memberId: string,
  cardId: BayoCardId,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const syncedMember = await syncMemberPassiveMoneyPrinter(member);
  const ownedCards = getMemberBayoCards(syncedMember);

  if (!ownedCards.includes(cardId)) {
    return null;
  }

  const activeCards = getMemberActiveBayoCards(syncedMember);
  const isActive = activeCards.includes(cardId);
  let nextActiveCards: BayoCardId[];

  if (isActive) {
    nextActiveCards = activeCards.filter((activeCard) => activeCard !== cardId);

    if (cardId === doublayCardId) {
      nextActiveCards = nextActiveCards.slice(0, 1);
    }
  } else if (cardId === doublayCardId) {
    nextActiveCards = [
      doublayCardId,
      ...activeCards.filter((activeCard) => activeCard !== doublayCardId),
    ].slice(0, 3);
  } else if (activeCards.includes(doublayCardId)) {
    if (activeCards.length >= getBayoCardActiveSlotCount(activeCards)) {
      return null;
    }

    nextActiveCards = [...activeCards, cardId];
  } else {
    nextActiveCards = [cardId];
  }

  const now = Date.now();
  const moneyPrinter = getMemberMoneyPrinter(syncedMember);
  const nextMoneyPrinter = { ...moneyPrinter };

  if (!isActive && cardId === moneyPrinterICardId) {
    nextMoneyPrinter.activeIAt = now;
  }

  if (!isActive && cardId === moneyPrinterIICardId) {
    nextMoneyPrinter.passiveIIAt = now;
  }

  if (!isActive && cardId === moneyPrinterIIICardId) {
    nextMoneyPrinter.passiveIIIAt = now;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(syncedMember.links ?? {}),
        _activeBayoCards: nextActiveCards,
        _moneyPrinter: nextMoneyPrinter,
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${syncedMember.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function purchaseMemberBayoStamp(
  memberId: string,
  stampId: BayoStampId,
) {
  const member = await getMemberRowByNumber(memberId);
  const stamp = bayoStamps.find((candidate) => candidate.id === stampId);

  if (!member || !stamp) {
    return null;
  }

  const syncedMember = await syncMemberPassiveMoneyPrinter(member);
  const ownedStamps = getMemberBayoStamps(syncedMember);

  if (ownedStamps.includes(stamp.id)) {
    return getPublicMemberFromRow(syncedMember);
  }

  const bayoCoins = normalizePointBalance(syncedMember.bayo_coins);

  if (bayoCoins < stamp.coinCost) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      bayo_coins: bayoCoins - stamp.coinCost,
      links: {
        ...(syncedMember.links ?? {}),
        _bayoStamps: [...ownedStamps, stamp.id],
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${syncedMember.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getPublicMemberFromRow(rows[0]) : null;
}

export async function claimMemberMoneyPrinterI(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const syncedMember = await syncMemberPassiveMoneyPrinter(member);
  const activeCards = getMemberActiveBayoCards(syncedMember);

  if (!activeCards.includes(moneyPrinterICardId)) {
    return {
      member: await getPublicMemberFromRow(syncedMember),
      points: 0,
    };
  }

  const now = Date.now();
  const moneyPrinter = getMemberMoneyPrinter(syncedMember);
  const result = getAccruedMoneyPrinterPoints(
    moneyPrinter.activeIAt,
    now,
    moneyPrinterIIntervalMs,
    moneyPrinterIPointValue,
  );
  const nextMoneyPrinter = {
    ...moneyPrinter,
    activeIAt: result.nextAt,
  };
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      ...(result.points > 0
        ? getMemberPointAwardBody(syncedMember, result.points)
        : {}),
      links: {
        ...(syncedMember.links ?? {}),
        _moneyPrinter: nextMoneyPrinter,
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${syncedMember.member_number}`,
      select: "*",
    },
  });
  const updatedMember = rows[0] ?? syncedMember;

  return {
    member: await getPublicMemberFromRow(updatedMember),
    points: result.points,
  };
}

export async function getMemberProfileVisitCount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberProfileVisits(member) : 0;
}

async function getMemberArticleReadCountFromRow(member: MemberRow) {
  const rows = await supabaseRequest<MemberArticleReadRow[]>(
    "member_article_reads",
    {
      query: {
        member_id: `eq.${member.id}`,
        select: "post_id",
      },
    },
  );

  return rows.length;
}

export async function getMemberArticleReadCount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberArticleReadCountFromRow(member) : 0;
}

export async function getMemberCryptiProfileVisitCount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberCryptiProfileVisits(member) : 0;
}

export async function listMemberOwnedCryptiTickerSymbols(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member
    ? normalizeCryptiOwnedTickerSymbols(member.links?._cryptiOwnedTickers)
    : [];
}

export async function addMemberOwnedCryptiTickerSymbol(
  memberId: string,
  symbol: string,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  const ownedTickerSymbols = normalizeCryptiOwnedTickerSymbols([
    ...(member.links?._cryptiOwnedTickers ?? []),
    symbol,
  ]);

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(member.links ?? {}),
        _cryptiOwnedTickers: ownedTickerSymbols,
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0]
    ? normalizeCryptiOwnedTickerSymbols(rows[0].links?._cryptiOwnedTickers)
    : ownedTickerSymbols;
}

export async function removeMemberOwnedCryptiTickerSymbol(
  memberId: string,
  symbol: string,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  const normalizedSymbol = normalizeCryptiOwnedTickerSymbols([symbol])[0] ?? "";
  const ownedTickerSymbols = normalizeCryptiOwnedTickerSymbols(
    member.links?._cryptiOwnedTickers,
  ).filter((ownedSymbol) => ownedSymbol !== normalizedSymbol);

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(member.links ?? {}),
        _cryptiOwnedTickers: ownedTickerSymbols,
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0]
    ? normalizeCryptiOwnedTickerSymbols(rows[0].links?._cryptiOwnedTickers)
    : ownedTickerSymbols;
}

export async function incrementMemberProfileVisitCount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const profileVisits = getMemberProfileVisits(member) + 1;
  const availablePoints =
    normalizePointBalance(member.available_points) + profileVisitPointValue;
  const lifetimePoints =
    normalizePointBalance(member.lifetime_points) + profileVisitPointValue;
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      available_points: availablePoints,
      crypti_rank: getPromotedMemberCryptiRank(member, lifetimePoints),
      lifetime_points: lifetimePoints,
      links: {
        ...(member.links ?? {}),
        _stats: {
          ...(member.links?._stats ?? {}),
          profileVisits,
        },
      },
      rank: getPromotedBayRankForLifetimePoints(lifetimePoints, member.rank),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  const updatedMember = rows[0] ?? member;

  return {
    member: await getPublicMemberFromRow(updatedMember),
    pageVisits: getMemberProfileVisits(updatedMember),
    points: profileVisitPointValue,
  };
}

export async function incrementMemberCryptiProfileVisitCount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const profileVisits = getMemberCryptiProfileVisits(member) + 1;
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(member.links ?? {}),
        _cryptiStats: {
          ...(member.links?._cryptiStats ?? {}),
          profileVisits,
        },
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getMemberCryptiProfileVisits(rows[0]) : profileVisits;
}

export async function getMemberTicketVoteNextAt(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberTicketVoteNextAtFromRow(member) : 0;
}

export async function listMemberTicketedPostIds(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberTicketedPostIds(member) : [];
}

export async function startMemberTicketVoteCooldown(
  memberId: string,
  nextAt: number,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return 0;
  }

  const normalizedNextAt = normalizeTicketVoteNextAt(nextAt);
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(member.links ?? {}),
        _ticketVote: {
          ...(member.links?._ticketVote ?? {}),
          nextAt: normalizedNextAt,
        },
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0] ? getMemberTicketVoteNextAtFromRow(rows[0]) : normalizedNextAt;
}

export async function getMemberCryptiTicketVoteNextAt(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberCryptiTicketVoteNextAtFromRow(member) : 0;
}

export async function listMemberCryptiTicketedPostIds(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberCryptiTicketedPostIds(member) : [];
}

export async function startMemberCryptiTicketVoteCooldown(
  memberId: string,
  nextAt: number,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return 0;
  }

  const normalizedNextAt = normalizeTicketVoteNextAt(nextAt);
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(member.links ?? {}),
        _cryptiTicketVote: {
          ...(member.links?._cryptiTicketVote ?? {}),
          nextAt: normalizedNextAt,
        },
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      member_number: `eq.${member.member_number}`,
      select: "*",
    },
  });

  return rows[0]
    ? getMemberCryptiTicketVoteNextAtFromRow(rows[0])
    : normalizedNextAt;
}

export async function wipeMemberAccount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return false;
  }

  await supabaseRequest<PostRow[]>("posts", {
    body: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=minimal",
    query: { author_member_id: `eq.${member.id}` },
  });

  await supabaseRequest<PostCommentRow[]>("post_comments", {
    body: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=minimal",
    query: { author_member_id: `eq.${member.id}` },
  });

  await supabaseRequest<null>("post_truth_votes", {
    method: "DELETE",
    query: { member_id: `eq.${member.id}` },
  });

  await supabaseRequest<null>("member_article_reads", {
    method: "DELETE",
    query: { member_id: `eq.${member.id}` },
  });

  return true;
}

export async function deleteMemberAccount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return false;
  }

  await wipeMemberAccount(memberId);
  await supabaseRequest<MemberRow[]>("members", {
    body: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=minimal",
    query: { id: `eq.${member.id}` },
  });

  return true;
}

export async function verifyMemberPin(memberId: string, pin: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const credential = await getCredential(member.id);

  if (!credential) {
    return null;
  }

  return hashPin(pin, credential.pin_salt) === credential.pin_hash
    ? getPublicMemberFromRow(member)
    : null;
}

export async function createMemberSession(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  await supabaseRequest<MemberSessionRow[]>("member_sessions", {
    body: {
      expires_at: getSessionExpiry(),
      member_id: member.id,
      token_hash: hashToken(token),
    },
    method: "POST",
    prefer: "return=minimal",
  });

  return token;
}

export async function getMemberFromSessionToken(token: string) {
  const member = await getMemberRowBySessionToken(token);

  return member
    ? getPublicMemberFromRow(await syncMemberPassiveMoneyPrinter(member))
    : null;
}

export async function revokeMemberSession(token: string) {
  if (!token) {
    return;
  }

  await supabaseRequest<MemberSessionRow[]>("member_sessions", {
    body: {
      revoked_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=minimal",
    query: { token_hash: `eq.${hashToken(token)}` },
  });
}

export async function listPosts(category?: string) {
  const query: Record<string, string | number | boolean | undefined> = {
    deleted_at: "is.null",
    moderation_status: "eq.active",
    order: "created_at.desc",
    select: "*",
  };

  if (category) {
    query.category = `eq.${category}`;
  }

  const posts = await supabaseRequest<PostRow[]>("posts", { query });

  return posts.map(publicPost);
}

function isCommentablePost(post: PostRow | null) {
  return (
    Boolean(post) &&
    (post?.category === "daily-food" || post?.category === "theory") &&
    post?.meta?.cryptiPost !== "true"
  );
}

async function getCommentablePostRow(postId: string) {
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      deleted_at: "is.null",
      id: `eq.${postId}`,
      moderation_status: "eq.active",
      select: "*",
    },
  });
  const post = posts[0] ?? null;

  return isCommentablePost(post) ? post : null;
}

async function getActiveTruthVotes(postId: string) {
  return supabaseRequest<PostTruthVoteRow[]>("post_truth_votes", {
    query: {
      order: "updated_at.desc",
      post_id: `eq.${postId}`,
      select: "*",
    },
  });
}

async function syncPostTruthVoteMeta(post: PostRow, userMemberId?: string) {
  const votes = await getActiveTruthVotes(post.id);
  const summary = summarizeTruthVotes(votes, userMemberId);
  const updatedPosts = await supabaseRequest<PostRow[]>("posts", {
    body: {
      meta: {
        ...(post.meta ?? {}),
        truthAverageScore: summary.averageScore.toFixed(1),
        truthPointTenths: String(summary.pointValue * 10),
        truthScoreTotal: String(summary.scoreTotal),
        truthVoteCount: String(summary.voteCount),
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      id: `eq.${post.id}`,
      select: "*",
    },
  });

  return { post: publicPost(updatedPosts[0]), summary };
}

export async function listPostComments(postId: string) {
  const post = await getCommentablePostRow(postId);

  if (!post) {
    return null;
  }

  const comments = await supabaseRequest<PostCommentRow[]>("post_comments", {
    query: {
      deleted_at: "is.null",
      moderation_status: "eq.active",
      order: "created_at.asc",
      post_id: `eq.${post.id}`,
      select: "*",
    },
  });
  const authorIds = Array.from(
    new Set(
      comments
        .map((comment) => comment.author_member_id)
        .filter((memberId): memberId is string => Boolean(memberId)),
    ),
  );
  const authors = authorIds.length
    ? await supabaseRequest<MemberRow[]>("members", {
        query: {
          deleted_at: "is.null",
          id: `in.(${authorIds.join(",")})`,
          select: "*",
        },
      })
    : [];
  const authorsById = new Map(authors.map((author) => [author.id, author]));

  return comments.map((comment) =>
    publicPostComment(
      comment,
      comment.author_member_id
        ? authorsById.get(comment.author_member_id)
        : undefined,
    ),
  );
}

export async function createPostComment(
  postId: string,
  memberId: string,
  body: string,
) {
  const [post, member] = await Promise.all([
    getCommentablePostRow(postId),
    getMemberRowByNumber(memberId),
  ]);
  const commentBody = body.trim().replace(/\s+\n/g, "\n").slice(0, 600);

  if (!post || !member || !commentBody) {
    return null;
  }

  const comments = await supabaseRequest<PostCommentRow[]>("post_comments", {
    body: {
      author_member_id: member.id,
      author_member_number: member.member_number,
      body: commentBody,
      post_id: post.id,
    },
    method: "POST",
    prefer: "return=representation",
    query: { select: "*" },
  });

  return publicPostComment(comments[0], member);
}

export async function getPostTruthVoteSummary(
  postId: string,
  memberId?: string,
) {
  const post = await getCommentablePostRow(postId);

  if (!post) {
    return null;
  }

  const [member, votes] = await Promise.all([
    memberId ? getMemberRowByNumber(memberId) : Promise.resolve(null),
    getActiveTruthVotes(post.id),
  ]);

  return summarizeTruthVotes(votes, member?.id);
}

export async function togglePostTruthVote(
  postId: string,
  memberId: string,
  score: number,
) {
  const normalizedScore = Math.max(0, Math.min(11, Math.floor(score)));
  const [post, member] = await Promise.all([
    getCommentablePostRow(postId),
    getMemberRowByNumber(memberId),
  ]);

  if (!post || !member) {
    return null;
  }

  const existingVotes = await supabaseRequest<PostTruthVoteRow[]>(
    "post_truth_votes",
    {
      query: {
        member_id: `eq.${member.id}`,
        post_id: `eq.${post.id}`,
        select: "*",
      },
    },
  );
  const existingVote = existingVotes[0] ?? null;

  if (existingVote?.score === normalizedScore) {
    await supabaseRequest<null>("post_truth_votes", {
      method: "DELETE",
      query: {
        member_id: `eq.${member.id}`,
        post_id: `eq.${post.id}`,
      },
    });
  } else if (existingVote) {
    await supabaseRequest<PostTruthVoteRow[]>("post_truth_votes", {
      body: {
        point_value:
          getTruthVotePointValue(normalizedScore) *
          getTruthVoteCardMultiplier(member, post),
        score: normalizedScore,
        updated_at: new Date().toISOString(),
      },
      method: "PATCH",
      prefer: "return=minimal",
      query: {
        member_id: `eq.${member.id}`,
        post_id: `eq.${post.id}`,
      },
    });
  } else {
    await supabaseRequest<PostTruthVoteRow[]>("post_truth_votes", {
      body: {
        member_id: member.id,
        point_value:
          getTruthVotePointValue(normalizedScore) *
          getTruthVoteCardMultiplier(member, post),
        post_id: post.id,
        score: normalizedScore,
      },
      method: "POST",
      prefer: "return=minimal",
    });
  }

  return syncPostTruthVoteMeta(post, member.id);
}

export async function listPostsByAuthor(memberId: string) {
  const memberNumber = getMemberNumber(memberId);
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      anonymous: "eq.false",
      author_member_number: `eq.${memberNumber}`,
      deleted_at: "is.null",
      incognito: "eq.false",
      moderation_status: "eq.active",
      order: "created_at.desc",
      select: "*",
    },
  });

  return posts.map(publicPost);
}

export async function listPostsByAuthorForStats(memberId: string) {
  const memberNumber = getMemberNumber(memberId);
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      author_member_number: `eq.${memberNumber}`,
      deleted_at: "is.null",
      moderation_status: "eq.active",
      order: "created_at.desc",
      select: "*",
    },
  });

  return posts.map(publicPost);
}

export async function createPost(input: NewPostInput, authorMember: BayMember) {
  const author = await getMemberRowByNumber(authorMember.member);

  if (!author) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  const posts = await supabaseRequest<PostRow[]>("posts", {
    body: {
      anonymous: Boolean(input.anonymous),
      author_member_id: author.id,
      author_member_number: author.member_number,
      body: String(input.body ?? ""),
      category: input.category,
      incognito: Boolean(input.incognito),
      meta: input.meta ?? {},
      shelf_code: input.shelfCode ?? null,
      shelf_label: input.shelfLabel ?? null,
      title: String(input.title ?? "").slice(0, 140),
    },
    method: "POST",
    prefer: "return=representation",
    query: { select: "*" },
  });

  return publicPost(posts[0]);
}

export async function deletePost(postId: string, actorMember: BayMember) {
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      deleted_at: "is.null",
      id: `eq.${postId}`,
      select: "*",
    },
  });
  const post = posts[0];

  if (!post) {
    return false;
  }

  const actorMemberNumber = getMemberNumber(actorMember.member);
  if (post.author_member_number !== actorMemberNumber) {
    return false;
  }

  await supabaseRequest<PostRow[]>("posts", {
    body: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=minimal",
    query: { id: `eq.${post.id}` },
  });

  return true;
}

export async function updatePostAnonymous(
  postId: string,
  actorMember: BayMember,
  anonymous: boolean,
) {
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      deleted_at: "is.null",
      id: `eq.${postId}`,
      select: "*",
    },
  });
  const post = posts[0];

  if (!post) {
    return null;
  }

  const actorMemberNumber = getMemberNumber(actorMember.member);
  if (post.author_member_number !== actorMemberNumber) {
    return null;
  }

  const updatedPosts = await supabaseRequest<PostRow[]>("posts", {
    body: {
      anonymous,
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      id: `eq.${post.id}`,
      select: "*",
    },
  });

  return publicPost(updatedPosts[0]);
}

export async function incrementPostTicketVoteCount(postId: string) {
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      category: "eq.daily-food",
      deleted_at: "is.null",
      id: `eq.${postId}`,
      moderation_status: "eq.active",
      select: "*",
    },
  });
  const post = posts[0];

  if (!post) {
    return null;
  }

  const ticketVotes = getPostTicketVoteCount(post) + 1;
  const updatedPosts = await supabaseRequest<PostRow[]>("posts", {
    body: {
      meta: {
        ...(post.meta ?? {}),
        ticketVotes: String(ticketVotes),
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      id: `eq.${post.id}`,
      select: "*",
    },
  });

  return {
    post: publicPost(updatedPosts[0]),
    ticketVotes,
  };
}

export async function togglePostTicketVote(memberId: string, postId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      category: "in.(daily-food,theory,library-submission)",
      deleted_at: "is.null",
      id: `eq.${postId}`,
      moderation_status: "eq.active",
      select: "*",
    },
  });
  const post = posts[0];

  if (!post || post.meta?.cryptiPost === "true") {
    return null;
  }

  const ticketedPostIds = getMemberTicketedPostIds(member);
  const isTicketed = ticketedPostIds.includes(post.id);
  const nextTicketedPostIds = isTicketed
    ? ticketedPostIds.filter((ticketedPostId) => ticketedPostId !== post.id)
    : [...ticketedPostIds, post.id];
  const ticketVotes = Math.max(
    0,
    getPostTicketVoteCount(post) + (isTicketed ? -1 : 1),
  );

  const [updatedPosts] = await Promise.all([
    supabaseRequest<PostRow[]>("posts", {
      body: {
        meta: {
          ...(post.meta ?? {}),
          ticketVotes: String(ticketVotes),
        },
        updated_at: new Date().toISOString(),
      },
      method: "PATCH",
      prefer: "return=representation",
      query: {
        id: `eq.${post.id}`,
        select: "*",
      },
    }),
    supabaseRequest<MemberRow[]>("members", {
      body: {
        links: {
          ...(member.links ?? {}),
          _ticketVote: {
            ...(member.links?._ticketVote ?? {}),
            postIds: nextTicketedPostIds,
          },
        },
        updated_at: new Date().toISOString(),
      },
      method: "PATCH",
      prefer: "return=minimal",
      query: {
        member_number: `eq.${member.member_number}`,
      },
    }),
  ]);

  return {
    post: publicPost(updatedPosts[0]),
    ticketed: !isTicketed,
    ticketVotes,
  };
}

async function awardArticleReadPoints(member: MemberRow) {
  const availablePoints =
    normalizePointBalance(member.available_points) + articleReadPointValue;
  const lifetimePoints =
    normalizePointBalance(member.lifetime_points) + articleReadPointValue;
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      available_points: availablePoints,
      lifetime_points: lifetimePoints,
      crypti_rank: getPromotedMemberCryptiRank(member, lifetimePoints),
      rank: getPromotedBayRankForLifetimePoints(lifetimePoints, member.rank),
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      id: `eq.${member.id}`,
      select: "*",
    },
  });

  return rows[0]
    ? getPublicMemberFromRow(rows[0])
    : getPublicMemberFromRow(member);
}

async function recordMemberArticleRead(memberId: string, post: PostRow) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const existing = await supabaseRequest<MemberArticleReadRow[]>(
    "member_article_reads",
    {
      query: {
        member_id: `eq.${member.id}`,
        post_id: `eq.${post.id}`,
        select: "post_id",
      },
    },
  );

  if (existing.length) {
    return {
      articlesRead: await getMemberArticleReadCountFromRow(member),
      earned: false,
      member: await getPublicMemberFromRow(member),
      points: 0,
    };
  }

  try {
    await supabaseRequest<MemberArticleReadRow[]>("member_article_reads", {
      body: {
        member_id: member.id,
        point_value: articleReadPointValue,
        post_id: post.id,
      },
      method: "POST",
      prefer: "return=minimal",
    });
  } catch (error) {
    if (!isMemberArticleReadUniqueViolation(error)) {
      throw error;
    }

    return {
      articlesRead: await getMemberArticleReadCountFromRow(member),
      earned: false,
      member: await getPublicMemberFromRow(member),
      points: 0,
    };
  }

  return {
    articlesRead: await getMemberArticleReadCountFromRow(member),
    earned: true,
    member: await awardArticleReadPoints(member),
    points: articleReadPointValue,
  };
}

export async function incrementPostVisitCount(
  postId: string,
  viewerMemberId?: string,
) {
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      deleted_at: "is.null",
      id: `eq.${postId}`,
      moderation_status: "eq.active",
      select: "*",
    },
  });
  const post = posts[0];

  if (!post) {
    return null;
  }

  const postVisits = getPostVisitCount(post) + 1;
  const updatedPosts = await supabaseRequest<PostRow[]>("posts", {
    body: {
      meta: {
        ...(post.meta ?? {}),
        postVisits: String(postVisits),
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      id: `eq.${post.id}`,
      select: "*",
    },
  });
  const readReward = viewerMemberId
    ? await recordMemberArticleRead(viewerMemberId, post)
    : null;

  return {
    post: publicPost(updatedPosts[0]),
    postVisits,
    readReward,
  };
}

export async function incrementPostShareLinkClickCount(postId: string) {
  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      deleted_at: "is.null",
      id: `eq.${postId}`,
      moderation_status: "eq.active",
      select: "*",
    },
  });
  const post = posts[0];

  if (!post) {
    return null;
  }

  const shareLinkClicks = getPostShareLinkClickCount(post) + 1;
  const updatedPosts = await supabaseRequest<PostRow[]>("posts", {
    body: {
      meta: {
        ...(post.meta ?? {}),
        shareLinkClicks: String(shareLinkClicks),
      },
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    prefer: "return=representation",
    query: {
      id: `eq.${post.id}`,
      select: "*",
    },
  });

  return {
    post: publicPost(updatedPosts[0]),
    shareLinkClicks,
  };
}

export async function toggleCryptiPostTicketVote(
  memberId: string,
  postId: string,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      category: "eq.theory",
      deleted_at: "is.null",
      id: `eq.${postId}`,
      moderation_status: "eq.active",
      select: "*",
    },
  });
  const post = posts[0];

  if (!post || post.meta?.cryptiPost !== "true") {
    return null;
  }

  const ticketedPostIds = getMemberCryptiTicketedPostIds(member);
  const isTicketed = ticketedPostIds.includes(post.id);
  const nextTicketedPostIds = isTicketed
    ? ticketedPostIds.filter((ticketedPostId) => ticketedPostId !== post.id)
    : [...ticketedPostIds, post.id];
  const cryptiTicketVotes = Math.max(
    0,
    getPostCryptiTicketVoteCount(post) + (isTicketed ? -1 : 1),
  );

  const [updatedPosts] = await Promise.all([
    supabaseRequest<PostRow[]>("posts", {
      body: {
        meta: {
          ...(post.meta ?? {}),
          cryptiTicketVotes: String(cryptiTicketVotes),
        },
        updated_at: new Date().toISOString(),
      },
      method: "PATCH",
      prefer: "return=representation",
      query: {
        id: `eq.${post.id}`,
        select: "*",
      },
    }),
    supabaseRequest<MemberRow[]>("members", {
      body: {
        links: {
          ...(member.links ?? {}),
          _cryptiTicketVote: {
            ...(member.links?._cryptiTicketVote ?? {}),
            postIds: nextTicketedPostIds,
          },
        },
        updated_at: new Date().toISOString(),
      },
      method: "PATCH",
      prefer: "return=minimal",
      query: {
        member_number: `eq.${member.member_number}`,
      },
    }),
  ]);

  return {
    post: publicPost(updatedPosts[0]),
    ticketed: !isTicketed,
    ticketVotes: cryptiTicketVotes,
  };
}

const directMessageMaxLength = 1000;
const directMessageRetentionMs = 7 * 24 * 60 * 60 * 1000;

function getDirectMessageExpiresAt() {
  return new Date(Date.now() + directMessageRetentionMs).toISOString();
}

function normalizeDirectMessageBody(body: string) {
  return body.trim().replace(/\s+\n/g, "\n").slice(0, directMessageMaxLength);
}

async function cleanupExpiredDirectMessages() {
  await supabaseRequest<null>("direct_messages", {
    method: "DELETE",
    query: {
      expires_at: `lte.${new Date().toISOString()}`,
    },
  });
}

async function getMemberRowsByIds(memberIds: string[]) {
  const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));

  if (!uniqueMemberIds.length) {
    return [];
  }

  return supabaseRequest<MemberRow[]>("members", {
    query: {
      deleted_at: "is.null",
      id: `in.(${uniqueMemberIds.join(",")})`,
      select: "*",
    },
  });
}

async function getDirectMessageBlocksForMember(memberId: string) {
  return supabaseRequest<DirectMessageBlockRow[]>("direct_message_blocks", {
    query: {
      or: `(blocker_member_id.eq.${memberId},blocked_member_id.eq.${memberId})`,
      select: "*",
    },
  });
}

async function getDirectMessageBlocksBetween(
  firstMemberId: string,
  secondMemberId: string,
) {
  if (firstMemberId === secondMemberId) {
    return [];
  }

  return supabaseRequest<DirectMessageBlockRow[]>("direct_message_blocks", {
    query: {
      or: `(and(blocker_member_id.eq.${firstMemberId},blocked_member_id.eq.${secondMemberId}),and(blocker_member_id.eq.${secondMemberId},blocked_member_id.eq.${firstMemberId}))`,
      select: "*",
    },
  });
}

function getDirectMessageBlockFlags(
  blocks: DirectMessageBlockRow[],
  currentMemberId: string,
  otherMemberId: string,
) {
  return {
    hasBlockedMe: blocks.some(
      (block) =>
        block.blocker_member_id === otherMemberId &&
        block.blocked_member_id === currentMemberId,
    ),
    isBlockedByMe: blocks.some(
      (block) =>
        block.blocker_member_id === currentMemberId &&
        block.blocked_member_id === otherMemberId,
    ),
  };
}

export async function listDirectConversations(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return [];
  }

  await cleanupExpiredDirectMessages();

  const [messages, blocks] = await Promise.all([
    supabaseRequest<DirectMessageRow[]>("direct_messages", {
      query: {
        expires_at: `gt.${new Date().toISOString()}`,
        or: `(sender_member_id.eq.${member.id},recipient_member_id.eq.${member.id})`,
        order: "created_at.desc",
        select: "*",
      },
    }),
    getDirectMessageBlocksForMember(member.id),
  ]);
  const conversationsByMemberId = new Map<string, DirectMessageRow>();

  messages.forEach((message) => {
    const otherMemberId =
      message.sender_member_id === member.id
        ? message.recipient_member_id
        : message.sender_member_id;

    if (!conversationsByMemberId.has(otherMemberId)) {
      conversationsByMemberId.set(otherMemberId, message);
    }
  });

  const conversationMemberIds = Array.from(conversationsByMemberId.keys());
  const members = await getMemberRowsByIds([member.id, ...conversationMemberIds]);
  const membersById = new Map(members.map((memberRow) => [memberRow.id, memberRow]));

  return conversationMemberIds
    .map<BayDirectConversation | null>((otherMemberId) => {
      const otherMember = membersById.get(otherMemberId);
      const latestMessage = conversationsByMemberId.get(otherMemberId);

      if (!otherMember || !latestMessage) {
        return null;
      }

      const unreadCount = messages.filter(
        (message) =>
          message.sender_member_id === otherMemberId &&
          message.recipient_member_id === member.id &&
          !message.read_at,
      ).length;
      const blockFlags = getDirectMessageBlockFlags(
        blocks,
        member.id,
        otherMemberId,
      );

      return {
        ...blockFlags,
        latestMessage: publicDirectMessage(latestMessage, member.id, membersById),
        member: publicDirectMessageMember(otherMember),
        unreadCount,
      };
    })
    .filter(
      (conversation): conversation is BayDirectConversation =>
        Boolean(conversation),
    );
}

export async function getDirectConversation(
  memberId: string,
  otherMemberId: string,
) {
  const [member, otherMember] = await Promise.all([
    getMemberRowByNumber(memberId),
    getMemberRowByNumber(otherMemberId),
  ]);

  if (!member || !otherMember) {
    return null;
  }

  await cleanupExpiredDirectMessages();

  const [messages, blocks] = await Promise.all([
    supabaseRequest<DirectMessageRow[]>("direct_messages", {
      query: {
        expires_at: `gt.${new Date().toISOString()}`,
        or: `(and(sender_member_id.eq.${member.id},recipient_member_id.eq.${otherMember.id}),and(sender_member_id.eq.${otherMember.id},recipient_member_id.eq.${member.id}))`,
        order: "created_at.asc",
        select: "*",
      },
    }),
    getDirectMessageBlocksBetween(member.id, otherMember.id),
  ]);
  const unreadIncomingMessages = messages.filter(
    (message) =>
      message.sender_member_id === otherMember.id &&
      message.recipient_member_id === member.id &&
      !message.read_at,
  );
  const markedReadAt = unreadIncomingMessages.length
    ? new Date().toISOString()
    : "";

  if (markedReadAt) {
    await supabaseRequest<DirectMessageRow[]>("direct_messages", {
      body: { read_at: markedReadAt },
      method: "PATCH",
      prefer: "return=minimal",
      query: {
        read_at: "is.null",
        recipient_member_id: `eq.${member.id}`,
        sender_member_id: `eq.${otherMember.id}`,
      },
    });
  }

  const membersById = new Map([
    [member.id, member],
    [otherMember.id, otherMember],
  ]);
  const blockFlags = getDirectMessageBlockFlags(blocks, member.id, otherMember.id);

  return {
    ...blockFlags,
    member: publicDirectMessageMember(otherMember),
    messages: messages.map((message) =>
      publicDirectMessage(
        message,
        member.id,
        membersById,
        markedReadAt &&
          message.sender_member_id === otherMember.id &&
          message.recipient_member_id === member.id
          ? markedReadAt
          : undefined,
      ),
    ),
  };
}

export async function createDirectMessage(
  senderMemberId: string,
  recipientMemberId: string,
  body: string,
) {
  const [sender, recipient] = await Promise.all([
    getMemberRowByNumber(senderMemberId),
    getMemberRowByNumber(recipientMemberId),
  ]);
  const messageBody = normalizeDirectMessageBody(body);

  if (!sender) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  if (!recipient || !messageBody) {
    return { blocked: false, message: null, recipient: null };
  }

  await cleanupExpiredDirectMessages();

  const blocks = await getDirectMessageBlocksBetween(sender.id, recipient.id);

  if (blocks.length) {
    return {
      ...getDirectMessageBlockFlags(blocks, sender.id, recipient.id),
      blocked: true,
      message: null,
      recipient: publicDirectMessageMember(recipient),
    };
  }

  const rows = await supabaseRequest<DirectMessageRow[]>("direct_messages", {
    body: {
      body: messageBody,
      expires_at: getDirectMessageExpiresAt(),
      recipient_member_id: recipient.id,
      sender_member_id: sender.id,
    },
    method: "POST",
    prefer: "return=representation",
    query: { select: "*" },
  });
  const membersById = new Map([
    [sender.id, sender],
    [recipient.id, recipient],
  ]);

  return {
    blocked: false,
    hasBlockedMe: false,
    isBlockedByMe: false,
    message: publicDirectMessage(rows[0], sender.id, membersById),
    recipient: publicDirectMessageMember(recipient),
  };
}

export async function setDirectMessageBlock(
  blockerMemberId: string,
  blockedMemberId: string,
  blocked: boolean,
) {
  const [blocker, blockedMember] = await Promise.all([
    getMemberRowByNumber(blockerMemberId),
    getMemberRowByNumber(blockedMemberId),
  ]);

  if (!blocker) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  if (!blockedMember || blocker.id === blockedMember.id) {
    return null;
  }

  if (!blocked) {
    await supabaseRequest<null>("direct_message_blocks", {
      method: "DELETE",
      query: {
        blocked_member_id: `eq.${blockedMember.id}`,
        blocker_member_id: `eq.${blocker.id}`,
      },
    });
  } else {
    const existingBlocks = await supabaseRequest<DirectMessageBlockRow[]>(
      "direct_message_blocks",
      {
        query: {
          blocked_member_id: `eq.${blockedMember.id}`,
          blocker_member_id: `eq.${blocker.id}`,
          select: "*",
        },
      },
    );

    if (!existingBlocks.length) {
      await supabaseRequest<DirectMessageBlockRow[]>("direct_message_blocks", {
        body: {
          blocked_member_id: blockedMember.id,
          blocker_member_id: blocker.id,
        },
        method: "POST",
        prefer: "return=minimal",
      });
    }
  }

  const blocks = await getDirectMessageBlocksBetween(blocker.id, blockedMember.id);

  return {
    member: publicDirectMessageMember(blockedMember),
    ...getDirectMessageBlockFlags(blocks, blocker.id, blockedMember.id),
  };
}

export async function listSavedPostIds(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return [];
  }

  const rows = await supabaseRequest<SavedPostRow[]>("saved_posts", {
    query: {
      member_id: `eq.${member.id}`,
      order: "created_at.desc",
      select: "post_id",
    },
  });

  return rows.map((row) => row.post_id);
}

export async function listSavedPostsByMember(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return [];
  }

  const savedRows = await supabaseRequest<SavedPostRow[]>("saved_posts", {
    query: {
      member_id: `eq.${member.id}`,
      order: "created_at.desc",
      select: "post_id",
    },
  });
  const postIds = savedRows.map((row) => row.post_id);

  if (!postIds.length) {
    return [];
  }

  const posts = await supabaseRequest<PostRow[]>("posts", {
    query: {
      deleted_at: "is.null",
      id: `in.(${postIds.join(",")})`,
      incognito: "eq.false",
      moderation_status: "eq.active",
      select: "*",
    },
  });
  const postsById = new Map(posts.map((post) => [post.id, publicPost(post)]));

  return postIds
    .map((postId) => postsById.get(postId))
    .filter((post): post is BayPost => Boolean(post));
}

export async function toggleSavedPost(memberId: string, postId: string) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    throw new BaySpaceStorageError("Authenticated member not found.");
  }

  const existing = await supabaseRequest<SavedPostRow[]>("saved_posts", {
    query: {
      member_id: `eq.${member.id}`,
      post_id: `eq.${postId}`,
      select: "member_id,post_id",
    },
  });

  if (existing.length) {
    await supabaseRequest<null>("saved_posts", {
      method: "DELETE",
      query: {
        member_id: `eq.${member.id}`,
        post_id: `eq.${postId}`,
      },
    });

    return false;
  }

  await supabaseRequest<SavedPostRow[]>("saved_posts", {
    body: {
      member_id: member.id,
      post_id: postId,
    },
    method: "POST",
    prefer: "return=minimal",
  });

  return true;
}

export async function countSavedPost(postId: string) {
  const counts = await countSavedPosts([postId]);

  return counts[postId] ?? 0;
}

export async function countSavedPosts(postIds: string[]) {
  if (!postIds.length) {
    return {};
  }

  const rows = await supabaseRequest<SavedPostRow[]>("saved_posts", {
    query: {
      post_id: `in.(${postIds.join(",")})`,
      select: "post_id",
    },
  });

  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
    return counts;
  }, {});
}
