import type { BayPostCategory } from "./bay-space-types";

export type BayRank =
  | "reader"
  | "reader-ii"
  | "poster"
  | "poster-ii"
  | "poster-iii"
  | "graduation";

export type CryptiRank =
  | ""
  | "reader-iii"
  | "poster-iv"
  | "poster-v"
  | "oracle";

export type GateKey =
  | "safari-nation"
  | "bayo-plus"
  | "crypti-plus"
  | "instant-rank-promotion"
  | "instant-rank-promotion-ii"
  | "oracle-badge"
  | "impossible-badge"
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
  | "money-printer-iii";

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
  | "islam"
  | "hebrew"
  | "christian"
  | "buddhist"
  | "jainism"
  | "hindu"
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
  promotionBonus: number;
};

type CryptiRankConfig = {
  id: Exclude<CryptiRank, "">;
  label: string;
  level: number;
  minLifetimePoints: number;
  requiresGateKey?: GateKey;
};

type GateKeyConfig = {
  id: GateKey;
  label: string;
  tokenCost: number;
  description: string;
};

type BayoTitleConfig = {
  id: BayoTitleId;
  label: string;
  coinCost: number;
};

type BayoCardConfig = {
  coinCost: number;
  description: string;
  id: BayoCardId;
  label: string;
};

type BayoStampConfig = {
  coinCost: number;
  tokenCost?: number;
  pointReward?: number;
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

export const publicReadCategories: BayPostCategory[] = [
  "top-story",
  "daily-food",
  "theory",
];
const memberReadCategories: BayPostCategory[] = [...publicReadCategories, "library-submission"];

export const defaultBayRank: BayRank = "reader";
export const defaultBayRankLabel = "Reader I";
export const defaultMemberRole = "reader";
export const defaultMemberTitle = "Reader I";
export const bayoCoinExchangeRate = 100;
export const bayoTokenExchangeRate = 5;
export const defaultStampPointReward = 1_000;
export const graduationTokenCost = 50;
export const graduationMilestonePoints = 500_000;
export const oracleBadgeTokenCost = 1000;
export const impossibleBadgePointCost = 1_000_000_000_000;
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
    canReadCategories: memberReadCategories,
    id: "reader",
    label: defaultBayRankLabel,
    level: 1,
    minLifetimePoints: 0,
    promotionBonus: 0,
  },
  {
    allowedPostCategories: ["theory", "library-submission"],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "poster",
    label: "Poster I",
    level: 2,
    minLifetimePoints: 10_000,
    promotionBonus: 350,
  },
  {
    allowedPostCategories: ["theory", "library-submission"],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "reader-ii",
    label: "Reader II",
    level: 3,
    minLifetimePoints: 100_000,
    promotionBonus: 100,
  },
  {
    allowedPostCategories: ["theory", "library-submission"],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "poster-ii",
    label: "Poster II",
    level: 4,
    minLifetimePoints: 200_000,
    promotionBonus: 1_000,
  },
  {
    allowedPostCategories: ["theory", "library-submission"],
    canExchangePoints: false,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "poster-iii",
    label: "Poster III",
    level: 5,
    minLifetimePoints: 250_000,
    promotionBonus: 5_000,
  },
  {
    allowedPostCategories: ["theory", "library-submission"],
    canExchangePoints: true,
    canReadCategories: [...publicReadCategories, "library-submission"],
    id: "graduation",
    label: "Graduation",
    level: 6,
    minLifetimePoints: 0,
    promotionBonus: 10_000,
  },
];

export const posterIICoinBonus = Math.floor(
  (getBayRankConfig("poster-ii").minLifetimePoints - getBayRankConfig("reader-ii").minLifetimePoints)
    / bayoCoinExchangeRate / 10,
);

export const gateKeys: GateKeyConfig[] = [
  {
    tokenCost: 5,
    description:
      "Lifetime citizenship to Safari Nation, the hotel and casino world coming soon.",
    id: "safari-nation",
    label: "Safari Nation",
  },
  {
    tokenCost: 20,
    description:
      "Join Bayo+ for Bay Area community meetups and like-minded thinkers.",
    id: "bayo-plus",
    label: "Bayo+",
  },
  {
    tokenCost: 50,
    description:
      "Advance to Reader III, unlock the +CRYPTI branch, and begin the path toward posting and blue-name status.",
    id: "crypti-plus",
    label: "+CRYPTI",
  },
  {
    tokenCost: 150,
    description:
      "Instantly advances the +CRYPTI branch to Poster IV. Requires +CRYPTI ownership.",
    id: "instant-rank-promotion",
    label: "Instant Rank Promotion I",
  },
  {
    tokenCost: 50,
    description:
      "Highest +CRYPTI rank. Requires Instant Rank Promotion I and advances the +CRYPTI branch to Poster V.",
    id: "instant-rank-promotion-ii",
    label: "Instant Rank Promotion II",
  },
  {
    tokenCost: oracleBadgeTokenCost,
    description:
      "Final Level 9 badge. Requires Graduation, +CRYPTI ownership, and Poster V. Unlocks Current Events and Top Story publishing.",
    id: "oracle-badge",
    label: "Oracle Badge",
  },
  {
    tokenCost: 0,
    description: "A private final badge for the explorer who found the hidden path.",
    id: "impossible-badge",
    label: "IMPOSSIBLE",
  },
  {
    tokenCost: 2000,
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
  {
    id: "oracle",
    label: "Oracle",
    level: 9,
    minLifetimePoints: 300000,
    requiresGateKey: "oracle-badge",
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
    coinCost: 125,
    description:
      "Indigo comments. Truth votes count x2 on Conspiracy and x1 on News.",
    id: "empath-card",
    label: "Empath Card",
  },
  {
    coinCost: 125,
    description:
      "Five gold stars by comment name. Truth votes count x2 on News and x1 on Conspiracy.",
    id: "hero-card",
    label: "Hero Card",
  },
  {
    coinCost: 25,
    description:
      "Special Library badge for users who want to rep the archive branch.",
    id: "library-card",
    label: "Library Card",
  },
  {
    coinCost: 55,
    description:
      "Allows three active cards total, with Doublay counted as one active card.",
    id: doublayCardId,
    label: "Doublay Card",
  },
  {
    coinCost: 5,
    description:
      "Generates 5 points per 30 minutes while logged in, Bay Space is open, and the mouse is on-screen.",
    id: moneyPrinterICardId,
    label: "Money Printer I",
  },
  {
    coinCost: 50,
    description:
      "Generates 10 points per 30 minutes while active, syncing when the account is loaded.",
    id: moneyPrinterIICardId,
    label: "Money Printer II",
  },
  {
    coinCost: 500,
    description:
      "Generates 30 points per 10 minutes while active, syncing when the account is loaded.",
    id: moneyPrinterIIICardId,
    label: "Money Printer III",
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
    description: "Available on your birthday when saved in Settings.",
    id: "birthday",
    label: "Birthday",
  },
  {
    coinCost: 0,
    tokenCost: 1,
    pointReward: 10_000,
    description: "Islam stamp.",
    id: "islam",
    label: "Islam",
  },
  {
    coinCost: 0,
    tokenCost: 1,
    pointReward: 25_000,
    description: "Hebrew stamp.",
    id: "hebrew",
    label: "Hebrew",
  },
  {
    coinCost: 0,
    tokenCost: 1,
    pointReward: 1_000,
    description: "Christian stamp.",
    id: "christian",
    label: "Christian",
  },
  {
    coinCost: 0,
    pointReward: 0,
    description: "Buddhist stamp.",
    id: "buddhist",
    label: "Buddhist",
  },
  {
    coinCost: 0,
    pointReward: 1_000,
    description: "Jainism stamp.",
    id: "jainism",
    label: "Jainism",
  },
  {
    coinCost: 0,
    tokenCost: 1,
    pointReward: 2_500,
    description: "Hindu stamp.",
    id: "hindu",
    label: "Hindu",
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
  return gateKeys.some((gateKey) => gateKey.id === gateKeyId);
}

export function getPromotionBonusPoints(
  previous: { cryptiRank?: CryptiRank | string; rank?: BayRank | string },
  next: { cryptiRank?: CryptiRank | string; rank?: BayRank | string },
) {
  const previousBayLevel = getBayRankLevel(previous?.rank);
  const nextBayLevel = getBayRankLevel(next?.rank);
  const bayBonus = bayRanks
    .filter(
      (rank) => rank.level > previousBayLevel && rank.level <= nextBayLevel,
    )
    .reduce((total, rank) => total + rank.promotionBonus, 0);
  const previousCryptiLevel = getCryptiRankConfig(previous?.cryptiRank)?.level ?? 0;
  const nextCryptiLevel = getCryptiRankConfig(next?.cryptiRank)?.level ?? 0;
  const cryptiBonus = cryptiRanks
    .filter(
      (rank) =>
        rank.level > previousCryptiLevel &&
        rank.level <= nextCryptiLevel &&
        rank.id !== "oracle",
    )
    .reduce((total, rank) => {
      const nextPromotion = cryptiRanks.find(
        (candidate) => candidate.level === rank.level + 1,
      );

      return total + Math.floor((nextPromotion?.minLifetimePoints ?? 0) * 0.1);
    }, 0);

  return bayBonus + cryptiBonus;
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

export function getBayPointMultiplier(rank: string | null | undefined) {
  return rank === "poster-iii" ? 2 : 1;
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

export function getNextBayPointRank(rank: string | null | undefined) {
  const level = getBayRankLevel(rank);
  return bayRanks.find(
    (candidate) => candidate.id !== "graduation" && candidate.level > level,
  );
}

export function getCryptiRankForLifetimePoints(
  points: number,
  currentRank: string | null | undefined = "",
) {
  const normalizedPoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  const currentConfig = getCryptiRankConfig(currentRank);
  const earnedConfig = cryptiRanks
    .filter((candidate) => !candidate.requiresGateKey)
    .reduce<CryptiRankConfig | null>(
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
        !candidate.requiresGateKey &&
        (!currentConfig || candidate.level > currentConfig.level),
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

  const nextRank = getNextBayPointRank(currentBayRank);

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
