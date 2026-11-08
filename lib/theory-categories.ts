import type { BayPost } from "./bay-space-types";

export const knowSomethingCategory = "KNOW SOMETHING";
export const knowSomethingArchiveHref = "/theories?section=know-something";
export const knowSomethingDeleteWindowMs = 2 * 60 * 1000;

export function isKnowSomethingCategory(value: unknown) {
  return typeof value === "string" && value.trim().toUpperCase() === knowSomethingCategory;
}

export function isKnowSomethingPost(post: Pick<BayPost, "category" | "meta">) {
  return post.category === "theory" && isKnowSomethingCategory(post.meta?.theoryCategory);
}

export const theoryCategories = [
  {
    label: "The Main Stream",
    zone: "ABOVE SURFACE",
    description:
      "the accepted public narrative and the version most people are currently hearing",
    legacyLabels: [],
  },
  {
    label: "The Surface Record",
    zone: "WATERLINE",
    description:
      "documents, evidence, confirmed events, and fact-based investigation",
    legacyLabels: ["FACT BASED"],
  },
  {
    label: "The Undercurrent",
    zone: "JUST BELOW",
    description:
      "general conspiracy theories and alternative interpretations of public events",
    legacyLabels: ["CONSPIRACY"],
  },
  {
    label: "Declassified",
    zone: "DESCENT 01",
    description:
      "information that was once hidden but has entered the public record",
    legacyLabels: ["DECLASSIFIED"],
  },
  {
    label: "Shadow Insight",
    zone: "DESCENT 02",
    description:
      "deep conspiracies, hidden networks, and difficult-to-prove connections",
    legacyLabels: [],
  },
  {
    label: "Mystic Oracle",
    zone: "DESCENT 03",
    description:
      "psychic insight, remote viewing, divination, and intuitive warnings",
    legacyLabels: ["PSYCHIC"],
  },
  {
    label: "Psychedelic Download",
    zone: "DESCENT 04",
    description:
      "altered-state messages, synchronicities, and synchronized experiences",
    legacyLabels: ["PSYCHEDELIC/DOWNLOAD"],
  },
  {
    label: "Rare Signals",
    zone: "OFF THE MAP",
    description:
      "obscure, lesser-known, unusual material that fits nowhere else",
    legacyLabels: ["MISC"],
  },
  {
    label: "Pure Hypothesis",
    zone: "DESCENT 05",
    description:
      "intentionally speculative ideas with no evidence required — just what if",
    legacyLabels: ["HYPOTHESIS"],
  },
  {
    label: "Dream Signals",
    zone: "DESCENT 06",
    description:
      "dreams, recurring visions, premonitions, and prophetic experiences",
    legacyLabels: ["DREAMS/VISIONS"],
  },
  {
    label: "Occult Depths",
    zone: "THE ABYSS",
    description:
      "esoteric systems, symbolism, rituals, secret traditions, and forbidden knowledge",
    legacyLabels: ["OCCULT"],
  },
] as const;

// The regular category list also serves the composer and Paste & Go.
export const theoryIcebergCategories = [
  ...theoryCategories.slice(0, 5),
  {
    label: knowSomethingCategory,
    zone: "GUEST DROP BOX",
    description: "anonymous notes left by visitors",
    legacyLabels: [],
  },
  ...theoryCategories.slice(5),
];

export function doesTheoryCategoryMatch(
  storedCategory: string,
  selectedCategory: string,
) {
  const normalizedStoredCategory = storedCategory.trim().toLowerCase();
  const normalizedSelectedCategory = selectedCategory.trim().toLowerCase();
  const category = theoryCategories.find(
    (candidate) => candidate.label.toLowerCase() === normalizedSelectedCategory,
  );

  if (!category) {
    return normalizedStoredCategory === normalizedSelectedCategory;
  }

  return [category.label, ...category.legacyLabels].some(
    (label) => label.toLowerCase() === normalizedStoredCategory,
  );
}
