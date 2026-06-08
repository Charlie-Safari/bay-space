import type { BayPostCategory } from "./bay-space-types";

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

export const baySpaceRoles: BaySpaceRole[] = [
  {
    allowedCategories: [],
    canUseAnonymous: false,
    canUseIncognito: false,
    description: "Read and reveal posts.",
    id: "curious reader",
    label: "Curious Reader",
    title: "Curious Reader",
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

function splitRoles(roles: string) {
  return roles
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
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
  return getRoleConfig(role)?.label ?? role;
}

export function getRoleReviewLabel(role: string) {
  const roleConfig = getRoleConfig(role);

  return roleConfig?.reviewLabel ?? roleConfig?.label ?? role;
}

export function getRoleDescription(role: string) {
  return getRoleConfig(role)?.description ?? "";
}

export function getAccountTitle(roles: string) {
  return getPrimaryRoleConfig(roles)?.title ?? "Curious Reader";
}

export function getRoleAcronym(roles: string) {
  return isCrypti(roles) ? "+" : isBayoClub(roles) ? "🦉" : "";
}

export function getAllowedPostCategories(roles: string) {
  return getPrimaryRoleConfig(roles)?.allowedCategories ?? [];
}

export function canPostCategory(roles: string, category: BayPostCategory) {
  return getAllowedPostCategories(roles).includes(category);
}

export function hasCreatorAccess(roles: string) {
  return getPrimaryRoleConfig(roles)?.id.startsWith("influencer -") ?? false;
}

export function isGhostRole(roles: string) {
  return getPrimaryRoleConfig(roles)?.id.startsWith("author -") ?? false;
}

export function canUseAnonymousPosting(roles: string) {
  return getPrimaryRoleConfig(roles)?.canUseAnonymous ?? false;
}

export function canUseIncognitoPosting(roles: string) {
  return getPrimaryRoleConfig(roles)?.canUseIncognito ?? false;
}

export function needsAdminCode(roles: string) {
  return getPrimaryRoleConfig(roles)?.requiresAdminCode ?? false;
}

export function needsBayoGate(roles: string) {
  return getPrimaryRoleConfig(roles)?.requiresBayoGate ?? false;
}

export function needsPrescreenAccess(roles: string) {
  return needsAdminCode(roles) || needsBayoGate(roles);
}

export function isBayoClub(roles: string) {
  return getPrimaryRoleConfig(roles)?.id === "bayo club";
}

export function isCrypti(roles: string) {
  return splitRoles(roles).includes("crypti");
}
