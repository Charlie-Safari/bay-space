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
  title: string;
};

export const baySpaceRoles: BaySpaceRole[] = [
  {
    allowedCategories: [],
    canUseAnonymous: false,
    canUseIncognito: false,
    description:
      "Read and reveal Bay Space. Posting access is closed for this account type.",
    id: "curious reader",
    label: "Reader",
    title: "Reader",
  },
  {
    allowedCategories: ["daily-food"],
    canUseAnonymous: true,
    canUseIncognito: true,
    description:
      "Post in Daily Food only. Anonymous and incognito posting are available. Library posting is closed.",
    id: "ghost author - daily food",
    label: "Ghost author - daily food",
    requiresAdminCode: true,
    title: "Ghost Author - Daily Food",
  },
  {
    allowedCategories: ["theory"],
    canUseAnonymous: true,
    canUseIncognito: true,
    description:
      "Post in Theories only. Anonymous and incognito posting are available. Library posting is closed.",
    id: "ghost author - theories",
    label: "Ghost author - theories",
    requiresAdminCode: true,
    title: "Ghost Author - Theories",
  },
  {
    allowedCategories: ["daily-food"],
    canUseAnonymous: false,
    canUseIncognito: false,
    description:
      "Post in Daily Food only. Anonymous and incognito posting are closed. Library posting is closed.",
    id: "author - daily food",
    label: "Author - daily food",
    requiresAdminCode: true,
    title: "Author - Daily Food",
  },
  {
    allowedCategories: ["theory"],
    canUseAnonymous: false,
    canUseIncognito: false,
    description:
      "Post in Theories only. Anonymous and incognito posting are closed. Library posting is closed.",
    id: "author - theories",
    label: "Author - theories",
    requiresAdminCode: true,
    title: "Author - Theories",
  },
  {
    allowedCategories: ["daily-food", "theory", "library-submission"],
    canUseAnonymous: true,
    canUseIncognito: true,
    description:
      "Unrestricted Bay Space posting access for Daily Food, Theories, and Library. Anonymous posting is available.",
    id: "bayo club",
    label: "Bayo Club",
    requiresBayoGate: true,
    title: "Bayo Club",
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

export function getRoleDescription(role: string) {
  return getRoleConfig(role)?.description ?? "";
}

export function getAccountTitle(roles: string) {
  return getPrimaryRoleConfig(roles)?.title ?? "Reader";
}

export function getRoleAcronym(roles: string) {
  return isBayoClub(roles) ? "🦉" : "";
}

export function getAllowedPostCategories(roles: string) {
  return getPrimaryRoleConfig(roles)?.allowedCategories ?? [];
}

export function canPostCategory(roles: string, category: BayPostCategory) {
  return getAllowedPostCategories(roles).includes(category);
}

export function hasCreatorAccess(roles: string) {
  return getPrimaryRoleConfig(roles)?.id.startsWith("author -") ?? false;
}

export function isGhostRole(roles: string) {
  return getPrimaryRoleConfig(roles)?.id.startsWith("ghost author -") ?? false;
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
