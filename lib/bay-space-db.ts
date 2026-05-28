import { createHash, randomBytes } from "crypto";
import {
  SupabaseServerError,
  supabaseRequest,
} from "./supabase/server";
import {
  BayMember,
  BayPost,
  PublicLink,
} from "./bay-space-types";
import { getPositiveInteger } from "./bay-space-scoring";
import {
  isValidUsername,
  normalizeUsername,
} from "./bay-space-username";
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
  links?: {
    x?: PublicLink;
    linkedin?: PublicLink;
    github?: PublicLink;
    youtube?: PublicLink;
  };
};

type MemberStats = {
  profileVisits?: number;
};

type MemberTicketVote = {
  nextAt?: number;
  postIds?: string[];
};

type MemberLinks = Partial<NonNullable<BayMember["links"]>> & {
  _stats?: MemberStats;
  _cryptiTicketVote?: MemberTicketVote;
  _ticketVote?: MemberTicketVote;
};

type MemberRow = {
  agreement_accepted_at: string | null;
  agreement_version: string;
  birthday_month: string;
  birthday_year: string;
  created_at: string;
  deleted_at: string | null;
  email: string;
  id: string;
  links: MemberLinks;
  member_number: number;
  name: string;
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
  return title.trim().slice(0, 80) || "Curious Reader";
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
    member: formatMemberId(member.member_number),
    name: member.name,
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

function getPostTicketVoteCount(post: PostRow) {
  return getPositiveInteger(post.meta?.ticketVotes);
}

function getPostCryptiTicketVoteCount(post: PostRow) {
  return getPositiveInteger(post.meta?.cryptiTicketVotes);
}

function getPostVisitCount(post: PostRow) {
  return getPositiveInteger(post.meta?.postVisits);
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

function normalizeProfileVisitCount(value: unknown) {
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function getMemberProfileVisits(member: MemberRow) {
  return normalizeProfileVisitCount(member.links?._stats?.profileVisits);
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

  return member ? getPublicMemberFromRow(member) : null;
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
        title: normalizeTitle(input.title),
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
  await setMemberRoles(member.id, input.roles);

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

export async function updateMemberSettings(
  memberId: string,
  input: MemberSettingsInput,
) {
  const member = await getMemberRowByNumber(memberId);

  if (!member) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      birthday_month: input.birthdayMonth?.trim().slice(0, 2) ?? "",
      birthday_year: input.birthdayYear?.trim().slice(0, 4) ?? "",
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

export async function getMemberProfileVisitCount(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberProfileVisits(member) : 0;
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
  const rows = await supabaseRequest<MemberRow[]>("members", {
    body: {
      links: {
        ...(member.links ?? {}),
        _stats: {
          ...(member.links?._stats ?? {}),
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

  return rows[0] ? getMemberProfileVisits(rows[0]) : profileVisits;
}

export async function getMemberTicketVoteNextAt(memberId: string) {
  const member = await getMemberRowByNumber(memberId);

  return member ? getMemberTicketVoteNextAtFromRow(member) : 0;
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

  return member ? getPublicMemberFromRow(member) : null;
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

export async function incrementPostVisitCount(postId: string) {
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

  return {
    post: publicPost(updatedPosts[0]),
    postVisits,
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
