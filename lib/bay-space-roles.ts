import type { BayPostCategory } from "./bay-space-types";

type BaySpaceRole = {
  acronym: string;
  allowedCategories: BayPostCategory[];
  description: string;
  id: string;
  label: string;
  title: string;
};

export const baySpaceRoles: BaySpaceRole[] = [
  {
    acronym: "CR",
    allowedCategories: ["library-submission"],
    description:
      "Read and reveal any tab or code channel. Post in Library.",
    id: "curious reader",
    label: "CURIOUS READER (CR)",
    title: "Curious Reader",
  },
  {
    acronym: "GA-N",
    allowedCategories: ["daily-food", "library-submission"],
    description:
      "Read and reveal any tab or code channel. Post in Daily Food and Library. Daily Food author stays classified unless the post is favorited.",
    id: "ghost author - news",
    label: "GHOST AUTHOR - NEWS (GA-N)",
    title: "Ghost Author - News",
  },
  {
    acronym: "GA-T",
    allowedCategories: ["theory", "library-submission"],
    description:
      "Read and reveal any tab or code channel. Post in Theories and Library.",
    id: "ghost author - theories",
    label: "GHOST AUTHOR - THEORIES (GA-T)",
    title: "Ghost Author - Theories",
  },
  {
    acronym: "CI-N",
    allowedCategories: ["top-story", "daily-food", "library-submission"],
    description:
      "Read and reveal any tab or code channel. Post in Top Story, Daily Food, and Library.",
    id: "creator/ influencer - news",
    label: "CREATOR/ INFLUENCER - NEWS (CI-N)",
    title: "Creator/ Influencer - News",
  },
  {
    acronym: "CI-T",
    allowedCategories: ["top-story", "theory", "library-submission"],
    description:
      "Read and reveal any tab or code channel. Post in Top Story, Theories, and Library.",
    id: "creator/ influencer - theories",
    label: "CREATOR/ INFLUENCER - THEORIES (CI-T)",
    title: "Creator/ Influencer - Theories",
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
  return getPrimaryRoleConfig(roles)?.title ?? "Curious Reader";
}

export function getRoleAcronym(roles: string) {
  return getPrimaryRoleConfig(roles)?.acronym ?? "";
}

export function getAllowedPostCategories(roles: string) {
  return getPrimaryRoleConfig(roles)?.allowedCategories ?? [];
}

export function canPostCategory(roles: string, category: BayPostCategory) {
  return getAllowedPostCategories(roles).includes(category);
}

export function hasCreatorAccess(roles: string) {
  return getPrimaryRoleConfig(roles)?.acronym.startsWith("CI-") ?? false;
}

export function isGhostRole(roles: string) {
  return getPrimaryRoleConfig(roles)?.acronym.startsWith("GA-") ?? false;
}
