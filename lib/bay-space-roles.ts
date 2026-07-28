import type { BayPostCategory } from "./bay-space-types";
import {
  defaultBayRank,
  defaultMemberRole,
  defaultMemberTitle,
  getBayRankConfig,
  getBayRankLabel,
  normalizeBayRank,
  type BayRank,
  type CryptiRank,
  type GateKey,
} from "./bay-space-ranks";

type BaySpaceRole = {
  allowedCategories: BayPostCategory[];
  canUseAnonymous: boolean;
  canUseIncognito: boolean;
  description: string;
  id: string;
  label: string;
  requiresAdminCode?: boolean;
  requiresBayoGate?: boolean;
  reviewLabel?: string;
  title: string;
};

type PermissionSubject =
  | string
  | {
      cryptiRank?: CryptiRank | string;
      gateKeys?: Array<GateKey | string>;
      rank?: BayRank | string;
      roles?: string;
    }
  | null
  | undefined;

export const baySpaceRoles: BaySpaceRole[] = [
  {
    allowedCategories: [],
    canUseAnonymous: false,
    canUseIncognito: false,
    description: "Read and reveal posts.",
    id: "reader",
    label: "Reader",
    title: "Reader",
  },
  {
    allowedCategories: [],
    canUseAnonymous: false,
    canUseIncognito: false,
    description: "Legacy reader account. Promotes into the new Reader ladder.",
    id: "curious reader",
    label: "Curious Reader",
    title: "Reader",
  },
  {
    allowedCategories: [],
    canUseAnonymous: false,
    canUseIncognito: false,
    description: "Can read Library in addition to Theories and News.",
    id: "reader-ii",
    label: "Reader II",
    title: "Reader II",
  },
  {
    allowedCategories: ["theory"],
    canUseAnonymous: true,
    canUseIncognito: false,
    description: "Can post in conspiracies.",
    id: "poster",
    label: "Poster",
    title: "Poster",
  },
  {
    allowedCategories: ["theory", "library-submission"],
    canUseAnonymous: true,
    canUseIncognito: false,
    description: "Can post in Library and conspiracies.",
    id: "poster-ii",
    label: "Poster II",
    title: "Poster II",
  },
  {
    allowedCategories: [
      "top-story",
      "daily-food",
      "theory",
      "library-submission",
    ],
    canUseAnonymous: true,
    canUseIncognito: true,
    description: "Can post in Theories, Library, and News.",
    id: "poster-iii",
    label: "Poster III",
    title: "Poster III",
  },
  {
    allowedCategories: [
      "top-story",
      "daily-food",
      "theory",
      "library-submission",
    ],
    canUseAnonymous: true,
    canUseIncognito: true,
    description:
      "Graduated account. Can post across Bay Space and exchange points for Bayo Coins.",
    id: "graduation",
    label: "Graduation",
    title: "Graduation",
  },
  {
    allowedCategories: ["daily-food", "library-submission"],
    canUseAnonymous: false,
    canUseIncognito: false,
    description:
      "Can only post in Daily Food and Library. Anon and incog unavailable.",
    id: "influencer - daily food",
    label: "Author/influencer - Daily Food",
    title: "Author/influencer - Daily Food",
  },
  {
    allowedCategories: ["theory", "library-submission"],
    canUseAnonymous: true,
    canUseIncognito: true,
    description:
      "Can only post in Theories and Library. Anon and incog available.",
    id: "influencer - theories",
    label: "Author/influencer - Theories",
    title: "Author/influencer - Theories",
  },
  {
    allowedCategories: ["daily-food", "theory", "library-submission"],
    canUseAnonymous: true,
    canUseIncognito: true,
    description:
      "Can post in Daily Food, Theories, and Library. Anon posts link to the user profile.",
    id: "bayo club",
    label: "Oracle",
    requiresBayoGate: true,
    title: "Oracle",
  },
  {
    allowedCategories: ["daily-food", "theory", "library-submission"],
    canUseAnonymous: true,
    canUseIncognito: true,
    description:
      "Unrestricted posting access anywhere. Required for viewing and posting on +CRYPTI.",
    id: "crypti",
    label: "+CRYPTI",
    reviewLabel: "+CRYPTI",
    requiresBayoGate: true,
    title: "+CRYPTI",
  },
];

function getRolesText(subject: PermissionSubject) {
  return typeof subject === "string" ? subject : subject?.roles ?? "";
}

function getGateKeys(subject: PermissionSubject) {
  return typeof subject === "string" ? [] : subject?.gateKeys ?? [];
}

function getCryptiRank(subject: PermissionSubject) {
  return typeof subject === "string" ? "" : subject?.cryptiRank ?? "";
}

function splitRoles(roles: string) {
  return roles
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
}

function getRankFromLegacyRoles(roles: string): BayRank {
  const normalizedRoles = splitRoles(roles);

  if (normalizedRoles.includes("graduation")) {
    return "graduation";
  }

  if (
    normalizedRoles.includes("poster-iii") ||
    normalizedRoles.includes("crypti") ||
    normalizedRoles.includes("bayo club")
  ) {
    return "poster-iii";
  }

  if (
    normalizedRoles.includes("poster-ii") ||
    normalizedRoles.includes("influencer - daily food") ||
    normalizedRoles.includes("influencer - theories")
  ) {
    return "poster-ii";
  }

  if (normalizedRoles.includes("poster")) {
    return "poster";
  }

  if (normalizedRoles.includes("reader-ii")) {
    return "reader-ii";
  }

  return defaultBayRank;
}

function getPermissionRank(subject: PermissionSubject) {
  if (typeof subject !== "string" && subject?.rank) {
    return normalizeBayRank(subject.rank);
  }

  return getRankFromLegacyRoles(getRolesText(subject));
}

export function getRoleConfig(role: string) {
  return baySpaceRoles.find(
    (roleConfig) => roleConfig.id === role.trim().toLowerCase(),
  );
}

export function getPrimaryRoleConfig(roles: string) {
  const selectedRole = splitRoles(roles)[0] ?? "";

  return getRoleConfig(selectedRole);
}

export function getRoleLabel(role: string) {
  return getRoleConfig(role)?.label ?? getBayRankLabel(role);
}

export function getRoleReviewLabel(role: string) {
  const roleConfig = getRoleConfig(role);

  return roleConfig?.reviewLabel ?? roleConfig?.label ?? getBayRankLabel(role);
}

export function getRoleDescription(role: string) {
  return getRoleConfig(role)?.description ?? "";
}

export function getAccountTitle(roles: string) {
  return getPrimaryRoleConfig(roles)?.title ?? defaultMemberTitle;
}

export function getRoleAcronym(subject: PermissionSubject) {
  return isCrypti(subject) ? "+" : isBayoClub(subject) ? "🦉" : "";
}

export function getAllowedReadCategories(subject: PermissionSubject) {
  return getBayRankConfig(getPermissionRank(subject)).canReadCategories;
}

export function canReadCategory(
  subject: PermissionSubject,
  category: BayPostCategory,
) {
  return getAllowedReadCategories(subject).includes(category);
}

export function getAllowedPostCategories(subject: PermissionSubject) {
  const rankCategories =
    getBayRankConfig(getPermissionRank(subject)).allowedPostCategories;
  const roleCategories =
    getPrimaryRoleConfig(getRolesText(subject))?.allowedCategories ?? [];

  return Array.from(new Set([...rankCategories, ...roleCategories]));
}

export function canPostCategory(
  subject: PermissionSubject,
  category: BayPostCategory,
) {
  return getAllowedPostCategories(subject).includes(category);
}

export function hasCreatorAccess(subject: PermissionSubject) {
  const roles = getRolesText(subject);

  return (
    getPrimaryRoleConfig(roles)?.id.startsWith("influencer -") ||
    getBayRankConfig(getPermissionRank(subject)).allowedPostCategories.length > 0
  );
}

export function isGhostRole(subject: PermissionSubject) {
  return getPrimaryRoleConfig(getRolesText(subject))?.id.startsWith("author -") ?? false;
}

export function canUseAnonymousPosting(subject: PermissionSubject) {
  return (
    getPrimaryRoleConfig(getRolesText(subject))?.canUseAnonymous ||
    getBayRankConfig(getPermissionRank(subject)).level >= 3
  );
}

export function canUseIncognitoPosting(subject: PermissionSubject) {
  return (
    getPrimaryRoleConfig(getRolesText(subject))?.canUseIncognito ||
    getBayRankConfig(getPermissionRank(subject)).level >= 5
  );
}

export function needsAdminCode(_roles: string) {
  return false;
}

export function needsBayoGate(_roles: string) {
  return false;
}

export function needsPrescreenAccess(_roles: string) {
  return false;
}

export function isBayoClub(subject: PermissionSubject) {
  const roles = splitRoles(getRolesText(subject));
  const gateKeys = getGateKeys(subject);

  return roles.includes("bayo club") || gateKeys.includes("bayo-plus");
}

export function isCrypti(subject: PermissionSubject) {
  const roles = splitRoles(getRolesText(subject));
  const gateKeys = getGateKeys(subject);
  const cryptiRank = getCryptiRank(subject);

  return (
    roles.includes("crypti") ||
    roles.includes("crypti-plus") ||
    gateKeys.includes("crypti-plus") ||
    cryptiRank === "reader-iii" ||
    cryptiRank === "poster-iv" ||
    cryptiRank === "poster-v"
  );
}

export { defaultMemberRole, defaultMemberTitle };
