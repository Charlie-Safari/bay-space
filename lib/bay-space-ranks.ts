import type { BayPostCategory } from "./bay-space-types";

export type BayRank =
  | "reader"
  | "reader-ii"
  | "poster"
  | "poster-ii"
  | "poster-iii"
  | "graduation";

export type CryptiRank = "" | "reader-iii" | "poster-iv" | "poster-v";

export type GateKey =
  | "safari-nation"
  | "bayo-plus"
  | "crypti-plus"
  | "instant-rank-promotion"
  | "instant-rank-promotion-ii"
  | "cabbin-wizard-club";

export type BayoTitleId =
  | "fact-checker"
  | "news-poster"
  | "conspiracy-master"
  | "truth-seeker"
  | "influencer"
  | "historian";

type BayRankConfig = {
  allowedPostCategories: BayPostCategory[];
  canExchangePoints: boolean;
  canReadCategories: BayPostCategory[];
  id: BayRank;
  label: string;
  level: number;
  minLifetimePoints: number;
};

type CryptiRankConfig = {
  id: Exclude<CryptiRank, "">;
  label: string;
  level: number;
  minLifetimePoints: number;
};

type GateKeyConfig = {
  id: GateKey;
  label: string;
  coinCost: number;
  description: string;
};

type BayoTitleConfig = {
  id: BayoTitleId;
  label: string;
  coinCost: number;
};

type PromotionTrack = "bay-space" | "crypti";

export type PromotionProgress = {
  label: string;
  pointsUntil: number;
  track: PromotionTrack;
};

const publicReadCategories: BayPostCategory[] = [
  "top-story",
  "daily-food",
  "theory",
];

export const defaultBayRank: BayRank = "reader";
export const defaultBayRankLabel = "Reader";
export const defaultMemberRole = "reader";
export const defaultMemberTitle = "Reader";
export const bayoCoinExchangeRate = 100;
export const graduationCoinCost = 500;

export const bayRanks: BayRankConfig[] = [
  {
    allowedPostCategories: [],
    canExchangePoints: false,
    canReadCategories: publicReadCategories,
    id: "reader",
    label: "Reader",
    level: 1,
    minLifetimePoints: 0,
  },
  {
    allowedPostCategories: [],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "reader-ii",
    label: "Reader II",
    level: 2,
    minLifetimePoints: 250,
  },
  {
    allowedPostCategories: ["theory"],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "poster",
    label: "Poster",
    level: 3,
    minLifetimePoints: 1000,
  },
  {
    allowedPostCategories: ["theory", "library-submission"],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "poster-ii",
    label: "Poster II",
    level: 4,
    minLifetimePoints: 3500,
  },
  {
    allowedPostCategories: [
      "top-story",
      "daily-food",
      "theory",
      "library-submission",
    ],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "poster-iii",
    label: "Poster III",
    level: 5,
    minLifetimePoints: 10000,
  },
  {
    allowedPostCategories: [
      "top-story",
      "daily-food",
      "theory",
      "library-submission",
    ],
    canExchangePoints: true,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "graduation",
    label: "Graduation",
    level: 6,
    minLifetimePoints: 50000,
  },
];

export const gateKeys: GateKeyConfig[] = [
  {
    coinCost: 25,
    description:
      "Lifetime citizenship to Safari Nation, the hotel and casino world coming soon.",
    id: "safari-nation",
    label: "Safari Nation",
  },
  {
    coinCost: 100,
    description:
      "Join the Oracle Club with bayoracle.com for Bay Area community meetups and like-minded thinkers.",
    id: "bayo-plus",
    label: "Bayo+",
  },
  {
    coinCost: 250,
    description:
      "Advance to Reader III, unlock the +CRYPTI branch, and begin the path toward posting and blue-name status.",
    id: "crypti-plus",
    label: "+CRYPTI",
  },
  {
    coinCost: 150,
    description:
      "Instantly advances the +CRYPTI branch to Poster IV. Requires +CRYPTI ownership.",
    id: "instant-rank-promotion",
    label: "Instant Rank Promotion",
  },
  {
    coinCost: 50,
    description:
      "Grand highest rank. Requires Instant Rank Promotion and advances the +CRYPTI branch to Poster V.",
    id: "instant-rank-promotion-ii",
    label: "Instant Rank Promotion II",
  },
  {
    coinCost: 10000,
    description:
      "Travel to Colorado for secret Cabal trading meetups when they happen.",
    id: "cabbin-wizard-club",
    label: "Cabbin Wizard Club",
  },
];

export const cryptiRanks: CryptiRankConfig[] = [
  {
    id: "reader-iii",
    label: "Reader III",
    level: 6,
    minLifetimePoints: 100000,
  },
  {
    id: "poster-iv",
    label: "Poster IV",
    level: 7,
    minLifetimePoints: 175000,
  },
  {
    id: "poster-v",
    label: "Poster V",
    level: 8,
    minLifetimePoints: 300000,
  },
];

export const bayoTitles: BayoTitleConfig[] = [
  { coinCost: 10, id: "fact-checker", label: "Fact Checker" },
  { coinCost: 10, id: "news-poster", label: "News Poster" },
  { coinCost: 10, id: "conspiracy-master", label: "Conspiracy Master" },
  { coinCost: 10, id: "truth-seeker", label: "Truth Seeker" },
  { coinCost: 10, id: "influencer", label: "Influencer" },
  { coinCost: 10, id: "historian", label: "Historian" },
];

export function getBayRankConfig(rank: string | null | undefined) {
  return bayRanks.find((candidate) => candidate.id === rank) ?? bayRanks[0];
}

export function normalizeBayRank(rank: string | null | undefined): BayRank {
  return getBayRankConfig(rank).id;
}

export function getBayRankLabel(rank: string | null | undefined) {
  return getBayRankConfig(rank).label;
}

export function getBayRankLevel(rank: string | null | undefined) {
  return getBayRankConfig(rank).level;
}

export function getCryptiRankConfig(rank: string | null | undefined) {
  return cryptiRanks.find((candidate) => candidate.id === rank) ?? null;
}

export function normalizeCryptiRank(rank: string | null | undefined): CryptiRank {
  return getCryptiRankConfig(rank)?.id ?? "";
}

export function getCryptiRankLabel(rank: string | null | undefined) {
  return getCryptiRankConfig(rank)?.label ?? "";
}

export function canRankExchangePoints(rank: string | null | undefined) {
  return getBayRankConfig(rank).canExchangePoints;
}

export function getRankForLifetimePoints(points: number) {
  const normalizedPoints = Number.isFinite(points) ? Math.max(0, points) : 0;

  return bayRanks
    .filter((candidate) => candidate.id !== "graduation")
    .reduce(
      (earnedRank, candidate) =>
        normalizedPoints >= candidate.minLifetimePoints
          ? candidate
          : earnedRank,
      bayRanks[0],
    ).id;
}

export function getPromotedBayRankForLifetimePoints(
  points: number,
  currentRank: string | null | undefined,
) {
  const normalizedCurrentRank = normalizeBayRank(currentRank);

  if (normalizedCurrentRank === "graduation") {
    return "graduation";
  }

  const earnedRank = getRankForLifetimePoints(points);

  return getBayRankLevel(earnedRank) >= getBayRankLevel(normalizedCurrentRank)
    ? earnedRank
    : normalizedCurrentRank;
}

export function getCryptiRankForLifetimePoints(
  points: number,
  currentRank: string | null | undefined = "",
) {
  const normalizedPoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  const currentConfig = getCryptiRankConfig(currentRank);
  const earnedConfig = cryptiRanks.reduce<CryptiRankConfig | null>(
    (earnedRank, candidate) =>
      normalizedPoints >= candidate.minLifetimePoints
        ? candidate
        : earnedRank,
    null,
  );

  if (!earnedConfig) {
    return currentConfig?.id ?? "";
  }

  if (currentConfig && currentConfig.level > earnedConfig.level) {
    return currentConfig.id;
  }

  return earnedConfig.id;
}

type PromotionSubject = {
  cryptiRank?: CryptiRank | string;
  gateKeys?: Array<GateKey | string>;
  rank?: BayRank | string;
} | null | undefined;

export function hasCryptiPromotionBranch(subject: PromotionSubject) {
  return (
    normalizeBayRank(subject?.rank) === "graduation" &&
    (subject?.gateKeys?.includes("crypti-plus") ||
      Boolean(normalizeCryptiRank(subject?.cryptiRank)))
  );
}

export function getNextPromotionProgress(
  points: number,
  subject?: PromotionSubject,
) {
  const normalizedPoints = Number.isFinite(points) ? Math.max(0, points) : 0;

  if (hasCryptiPromotionBranch(subject)) {
    const currentConfig = getCryptiRankConfig(subject?.cryptiRank);
    const nextCryptiRank = cryptiRanks.find(
      (candidate) =>
        !currentConfig || candidate.level > currentConfig.level,
    );

    return nextCryptiRank
      ? {
          label: nextCryptiRank.label,
          pointsUntil: Math.max(
            0,
            nextCryptiRank.minLifetimePoints - normalizedPoints,
          ),
          track: "crypti" satisfies PromotionTrack,
        }
      : null;
  }

  const currentBayRank = normalizeBayRank(subject?.rank);

  if (currentBayRank === "graduation") {
    return null;
  }

  const currentBayRankLevel = getBayRankLevel(currentBayRank);
  const nextRank = bayRanks
    .filter((candidate) => candidate.id !== "graduation")
    .find((candidate) => candidate.level > currentBayRankLevel);

  return nextRank
    ? {
        label: nextRank.label,
        pointsUntil: Math.max(0, nextRank.minLifetimePoints - normalizedPoints),
        track: "bay-space" satisfies PromotionTrack,
      }
    : null;
}

export function getPointsUntilNextPromotion(
  points: number,
  subject?: PromotionSubject,
) {
  return getNextPromotionProgress(points, subject)?.pointsUntil ?? 0;
}
