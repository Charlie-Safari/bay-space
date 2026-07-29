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

export type BayoCardId =
  | "empath-card"
  | "hero-card"
  | "library-card"
  | "doublay-card"
  | "money-printer-i"
  | "money-printer-ii"
  | "money-printer-iii"
  | "impossible-card";

export type BayoStampId =
  | "fountain-of-youth"
  | "millennial-fever-dream"
  | "senior-citizens"
  | "red-elephant"
  | "blue-donkey"
  | "red-blue-yingyang"
  | "mountains"
  | "oceans"
  | "islands"
  | "support-our-troops"
  | "vfw"
  | "summer"
  | "winter"
  | "fall"
  | "spring"
  | "seasons"
  | "holidays"
  | "birthday"
  | "rainbow"
  | "support-law-enforcement"
  | "support-israel"
  | "support-palestine";

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

type BayoCardConfig = {
  description: string;
  id: BayoCardId;
  label: string;
  tokenCost: number;
};

type BayoStampConfig = {
  coinCost: number;
  description: string;
  id: BayoStampId;
  label: string;
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
export const bayoTokenExchangeRate = 5;
export const graduationCoinCost = 500;
export const tokenGateKeys: GateKey[] = [
  "instant-rank-promotion",
  "instant-rank-promotion-ii",
];
export const doublayCardId: BayoCardId = "doublay-card";
export const moneyPrinterICardId: BayoCardId = "money-printer-i";
export const moneyPrinterIICardId: BayoCardId = "money-printer-ii";
export const moneyPrinterIIICardId: BayoCardId = "money-printer-iii";
export const moneyPrinterIIntervalMs = 30 * 60 * 1000;
export const moneyPrinterIIIntervalMs = 30 * 60 * 1000;
export const moneyPrinterIIIIntervalMs = 10 * 60 * 1000;
export const moneyPrinterIPointValue = 5;
export const moneyPrinterIIPointValue = 10;
export const moneyPrinterIIIPointValue = 30;

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
    label: "Instant Rank Promotion I",
  },
  {
    coinCost: 50,
    description:
      "Grand highest rank. Requires Instant Rank Promotion I and advances the +CRYPTI branch to Poster V.",
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

export const bayoCards: BayoCardConfig[] = [
  {
    description:
      "Indigo comments. Truth votes count x2 on Conspiracy and x1 on News.",
    id: "empath-card",
    label: "Empath Card",
    tokenCost: 25,
  },
  {
    description:
      "Five gold stars by comment name. Truth votes count x2 on News and x1 on Conspiracy.",
    id: "hero-card",
    label: "Hero Card",
    tokenCost: 25,
  },
  {
    description:
      "Special Library badge for users who want to rep the archive branch.",
    id: "library-card",
    label: "Library Card",
    tokenCost: 5,
  },
  {
    description:
      "Allows three active cards total, with Doublay counted as one active card.",
    id: doublayCardId,
    label: "Doublay Card",
    tokenCost: 11,
  },
  {
    description:
      "Generates 5 points per 30 minutes while logged in, Bay Space is open, and the mouse is on-screen.",
    id: moneyPrinterICardId,
    label: "Money Printer I",
    tokenCost: 1,
  },
  {
    description:
      "Generates 10 points per 30 minutes while active, syncing when the account is loaded.",
    id: moneyPrinterIICardId,
    label: "Money Printer II",
    tokenCost: 10,
  },
  {
    description:
      "Generates 30 points per 10 minutes while active, syncing when the account is loaded.",
    id: moneyPrinterIIICardId,
    label: "Money Printer III",
    tokenCost: 100,
  },
  {
    description:
      "Costs one billion tokens. No functional power, just legend status and street cred.",
    id: "impossible-card",
    label: "Impossible Card",
    tokenCost: 1000000000,
  },
];

export const bayoStamps: BayoStampConfig[] = [
  {
    coinCost: 1,
    description: "For users who want to rep new generations.",
    id: "fountain-of-youth",
    label: "Fountain of Youth",
  },
  {
    coinCost: 1,
    description: "For in-between millennials who want to rep this generation.",
    id: "millennial-fever-dream",
    label: "Millennial Fever Dream",
  },
  {
    coinCost: 1,
    description: "For users who want to rep older generations.",
    id: "senior-citizens",
    label: "Senior Citizens",
  },
  {
    coinCost: 1,
    description: "Right political party stamp.",
    id: "red-elephant",
    label: "Red Elephant",
  },
  {
    coinCost: 1,
    description: "Left political party stamp.",
    id: "blue-donkey",
    label: "Blue Donkey",
  },
  {
    coinCost: 1,
    description: "Mutual political party stamp.",
    id: "red-blue-yingyang",
    label: "Red and Blue Yingyang",
  },
  {
    coinCost: 1,
    description: "Mountain identity stamp.",
    id: "mountains",
    label: "Mountains",
  },
  {
    coinCost: 1,
    description: "Ocean identity stamp.",
    id: "oceans",
    label: "Oceans",
  },
  {
    coinCost: 1,
    description: "Island identity stamp.",
    id: "islands",
    label: "Islands",
  },
  {
    coinCost: 1,
    description: "Support our troops stamp.",
    id: "support-our-troops",
    label: "Support Our Troops",
  },
  {
    coinCost: 0,
    description: "Veterans of Foreign Wars stamp.",
    id: "vfw",
    label: "VFW",
  },
  {
    coinCost: 1,
    description: "Summer stamp.",
    id: "summer",
    label: "Summer",
  },
  {
    coinCost: 1,
    description: "Winter stamp.",
    id: "winter",
    label: "Winter",
  },
  {
    coinCost: 1,
    description: "Fall stamp.",
    id: "fall",
    label: "Fall",
  },
  {
    coinCost: 1,
    description: "Spring stamp.",
    id: "spring",
    label: "Spring",
  },
  {
    coinCost: 1,
    description: "All seasons stamp.",
    id: "seasons",
    label: "Seasons",
  },
  {
    coinCost: 1,
    description: "Holiday stamp.",
    id: "holidays",
    label: "Holidays",
  },
  {
    coinCost: 0,
    description: "Birthday stamp.",
    id: "birthday",
    label: "Birthday",
  },
  {
    coinCost: 2,
    description: "Rainbow stamp.",
    id: "rainbow",
    label: "Rainbow",
  },
  {
    coinCost: 5,
    description: "Support law enforcement stamp.",
    id: "support-law-enforcement",
    label: "Support Law Enforcement",
  },
  {
    coinCost: 1,
    description: "Support Israel stamp.",
    id: "support-israel",
    label: "Support Israel",
  },
  {
    coinCost: 1,
    description: "Support Palestine stamp.",
    id: "support-palestine",
    label: "Support Palestine",
  },
];

export function isTokenGateKey(gateKeyId: GateKey) {
  return tokenGateKeys.includes(gateKeyId);
}

export function isBayoCardId(cardId: string): cardId is BayoCardId {
  return bayoCards.some((card) => card.id === cardId);
}

export function isBayoStampId(stampId: string): stampId is BayoStampId {
  return bayoStamps.some((stamp) => stamp.id === stampId);
}

export function getBayoCardActiveSlotCount(activeCards: BayoCardId[]) {
  return activeCards.includes(doublayCardId) ? 3 : 1;
}

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
