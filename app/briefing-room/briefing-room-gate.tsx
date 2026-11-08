"use client";

import Link from "next/link";
import CirclesPanel from "./circles-panel";
import InboxPanel from "./inbox-panel";
import StatsPanel from "./stats-panel";
import QuizPanel from "./quiz-panel";
import { ThiagoArticleTools, ThiagoFormatter } from "./thiago-tools";
import ExchangeConversion, { roundExchangeAmount } from "./exchange-conversion";
import styles from "./briefing-room.module.css";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BayPost,
  deleteBayPost,
  getBayPosts,
  getDateKey,
  normalizeShelfLabel,
  postStoreEvent,
  saveBayPost,
} from "../components/post-store";
import {
  countFavoritePosts,
  favoriteStoreEvent,
  getFavoritePostIds,
} from "../components/favorite-store";
import {
  canAccessAdminAnalytics,
  canUseAnonymousPosting,
  canUseIncognitoPosting,
  getAllowedPostCategories,
  isBayoClub,
  isCrypti,
  isOracle,
} from "../../lib/bay-space-roles";
import {
  bayoCards,
  bayoCoinExchangeRate,
  bayoStamps,
  bayoTokenExchangeRate,
  defaultStampPointReward,
  gateKeys,
  getBayoCardActiveSlotCount,
  getBayRankLabel,
  getBayRankLevel,
  getCryptiRankLabel,
  getNextPromotionProgress,
  graduationTokenCost,
} from "../../lib/bay-space-ranks";
import type {
  BayRank,
  BayoCardId,
  BayoStampId,
  BayoTitleId,
  CryptiRank,
  GateKey,
} from "../../lib/bay-space-ranks";
import {
  dailyFoodCategories,
  defaultDailyFoodCategory,
} from "../../lib/daily-food-categories";
import { theoryCategories } from "../../lib/theory-categories";
import { parseThiagoV3, type ThiagoIntake } from "../../lib/thiago-v3-intake";
import {
  baySpaceAgreementHref,
  cryptiAgreementAcceptedStorageKey,
  cryptiAgreementHref,
  cryptiAgreementVersion,
} from "../../lib/bay-space-agreement";
import { getPostTopicTags } from "../../lib/bay-space-tags";
import { getPacificDateKey, isBirthdayOn } from "../../lib/pacific-date";
import TicketVoteCounter from "../components/ticket-vote-counter";
import { openExternalBrowser } from "../components/open-external-browser";

type BriefingRoomGateProps = {
  initialInboxMember?: string;
  initialPanel?: BriefingPanel;
  member: string;
};

type SavedMember = {
  activeBayoCards?: BayoCardId[];
  availablePoints?: number;
  bayoCards?: BayoCardId[];
  bayoCoins?: number;
  bayoStamps?: BayoStampId[];
  bayoTokens?: number;
  cryptiAgreementAcceptedAt?: string;
  cryptiAgreementVersion?: string;
  cryptiRank?: CryptiRank;
  dailySpinClaimedOn?: string;
  gateKeys?: GateKey[];
  lifetimePoints?: number;
  impossibleBadgeReady?: boolean;
  member: string;
  name: string;
  purchasedTitles?: BayoTitleId[];
  rank?: BayRank;
  refName: string;
  roles: string;
  title: string;
  email?: string;
  birthdayDay?: string;
  birthdayMonth?: string;
  birthdayYear?: string;
  links?: SettingsLinks;
};

type SettingsLinks = {
  x?: PublicProfileLink;
  linkedin?: PublicProfileLink;
  github?: PublicProfileLink;
  youtube?: PublicProfileLink;
};

const badgeQuestGateKeyOrder: GateKey[] = [
  "crypti-plus",
  "instant-rank-promotion",
  "instant-rank-promotion-ii",
  "oracle-badge",
  "safari-nation",
  "bayo-plus",
  "cabbin-wizard-club",
];

const badgeQuestGateKeys = badgeQuestGateKeyOrder
  .map((gateKeyId) => gateKeys.find((gateKey) => gateKey.id === gateKeyId))
  .filter((gateKey): gateKey is (typeof gateKeys)[number] => Boolean(gateKey));

type PublicProfileLink = {
  url: string;
  display: boolean;
};

type PostCategory =
  | "top-story"
  | "daily-food"
  | "theory"
  | "library-submission";
type BankPostCategory = Extract<PostCategory, "daily-food" | "theory">;
const thiagoModes = [
  { id: "chat", label: "🦉", name: "Owl chat" },
  { id: "investigate", label: "🔍", name: "Investigate" },
  { id: "bank", label: "🌀 Paste & Go 🎢", name: "Paste & Go" },
  { id: "format", label: "📝 Format", name: "Auto-format" },
] as const;
type LazyAssistantMode = (typeof thiagoModes)[number]["id"] | "preview";
type PostPreviewDraft = Omit<BayPost, "id" | "createdAt" | "dateKey">;

type SourceDraft = {
  id: number;
  link: string;
  connection: string;
};

type FavoriteCategory = "daily-food" | "theory" | "library-submission";
type BriefingPanel =
  | "quiz"
  | "id-card"
  | "post"
  | "stats"
  | "my-posts"
  | "favorites"
  | "inbox"
  | "lazy-assistant"
  | "circles"
  | "exchange"
  | "settings";

type PostDraft = {
  id: number;
  postCategory: PostCategory;
  topStoryStep: number;
  ticker: string;
  report: string;
  sources: string;
  sourceDrafts: SourceDraft[];
  dailyFoodHeadline: string;
  dailyFoodTag1: string;
  dailyFoodSource1: string;
  dailyFoodSourceOpen1: boolean;
  dailyFoodTag2: string;
  dailyFoodSource2: string;
  dailyFoodSourceOpen2: boolean;
  dailyFoodTag3: string;
  dailyFoodSource3: string;
  dailyFoodSourceOpen3: boolean;
  dailyFoodSkepticDebunkEvidence: string;
  dailyFoodSkepticDebunkSource: string;
  dailyFoodSkepticDebunkSourceOpen: boolean;
  dailyFoodCategory: string;
  theoryCategory: string;
  theoryHeadline: string;
  theoryPost: string;
  theorySkepticDebunkEvidence: string;
  theorySources: string[];
  libraryTitle: string;
  librarySubmission: string;
  librarySources: string[];
  postAnonymously: boolean;
  postIncognito: boolean;
  incognitoShelfLabel: string;
  isIncognitoShelfSet: boolean;
};

type ParsedBankPost = {
  body: string;
  category: BankPostCategory;
  dailyFoodCategory: string;
  skepticDebunkEvidence: string;
  sources: string[];
  tags: string[];
  theoryCategory: string;
  title: string;
  topicTags: string;
};

function createBlankPostDraft(id: number, postCategory: PostCategory): PostDraft {
  return {
    id,
    postCategory,
    topStoryStep: 1,
    ticker: "",
    report: "",
    sources: "",
    sourceDrafts: [],
    dailyFoodHeadline: "",
    dailyFoodTag1: "",
    dailyFoodSource1: "",
    dailyFoodSourceOpen1: false,
    dailyFoodTag2: "",
    dailyFoodSource2: "",
    dailyFoodSourceOpen2: false,
    dailyFoodTag3: "",
    dailyFoodSource3: "",
    dailyFoodSourceOpen3: false,
    dailyFoodSkepticDebunkEvidence: "",
    dailyFoodSkepticDebunkSource: "",
    dailyFoodSkepticDebunkSourceOpen: false,
    dailyFoodCategory: defaultDailyFoodCategory,
    theoryCategory: defaultTheoryCategory,
    theoryHeadline: "",
    theoryPost: "",
    theorySkepticDebunkEvidence: "",
    theorySources: ["", ""],
    libraryTitle: "",
    librarySubmission: "",
    librarySources: ["", ""],
    postAnonymously: false,
    postIncognito: false,
    incognitoShelfLabel: "",
    isIncognitoShelfSet: false,
  };
}

function normalizePostDraft(
  draft: Partial<PostDraft>,
  fallbackId: number,
  postCategory: PostCategory,
): PostDraft {
  const normalizedDraft = {
    ...createBlankPostDraft(
      typeof draft.id === "number" ? draft.id : fallbackId,
      postCategory,
    ),
    ...draft,
  };

  return {
    ...normalizedDraft,
    sourceDrafts: Array.isArray(normalizedDraft.sourceDrafts)
      ? normalizedDraft.sourceDrafts
      : [],
    theorySources:
      Array.isArray(normalizedDraft.theorySources) &&
      normalizedDraft.theorySources.length
        ? normalizedDraft.theorySources
        : ["", ""],
    librarySources:
      Array.isArray(normalizedDraft.librarySources) &&
      normalizedDraft.librarySources.length
        ? normalizedDraft.librarySources
        : ["", ""],
  };
}

function isCryptiPost(post: BayPost) {
  return post.meta?.cryptiPost === "true";
}

const postCategories: { id: PostCategory; label: string }[] = [
  { id: "daily-food", label: "Current Events" },
  { id: "theory", label: "Conspiracy" },
  { id: "library-submission", label: "Library submission" },
];

const activeMemberStorageKey = "bay-space-active-member";
const openPostDraftsStorageKey = "bay-space-open-post-drafts";
const baySpaceLazyEngineLabel = "Thiago";
const defaultTheoryCategory = "Rare Signals";
const supportEmail = "bayoadmin@protonmail.com";
const settingsAgreementHref = `${baySpaceAgreementHref}?${new URLSearchParams({
  returnTo: "/briefing-room?panel=settings",
})}`;
const optionRoomPanels: BriefingPanel[] = [
  "quiz",
  "exchange",
  "circles",
  "stats",
  "my-posts",
  "favorites",
  "inbox",
  "lazy-assistant",
  "settings",
];

function isOptionRoomPanel(panel: BriefingPanel) {
  return optionRoomPanels.includes(panel);
}

function getSettingsLinks(member: SavedMember | null): Required<SettingsLinks> {
  return {
    x: member?.links?.x ?? { url: "", display: false },
    linkedin: member?.links?.linkedin ?? { url: "", display: false },
    github: member?.links?.github ?? { url: "", display: false },
    youtube: member?.links?.youtube ?? { url: "", display: false },
  };
}

function getEditableMemberReferenceName(member: SavedMember | null) {
  const refName = member?.refName?.trim() ?? "";

  return refName || member?.name || "";
}

function formatPointCount(value: number | null | undefined) {
  const numericValue = Number(value);

  return (Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0)
    .toLocaleString("en-US");
}

async function fetchSavedMember(memberId: string): Promise<SavedMember | null> {
  const response = await fetch(`/api/members/${memberId}`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { member?: SavedMember };

  return data.member ?? null;
}

function expandTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function formatDailyFoodCode(dateKey: string, order: number) {
  return `DF ${dateKey.replaceAll("-", "")} #${order
    .toString()
    .padStart(4, "0")}`;
}

function getDailyFoodCategoryLabel(post: Pick<BayPost, "category" | "meta">) {
  const dailyFoodCategory = post.meta?.dailyFoodCategory;

  if (post.category !== "daily-food") {
    return post.category === "theory" ? "Conspiracy" : post.category.replace("-", " ");
  }

  return typeof dailyFoodCategory === "string" && dailyFoodCategory
    ? `Current Events - ${dailyFoodCategory}`
    : "Current Events";
}

function limitWords(value: string, limit: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length <= limit) {
    return value;
  }

  return words.slice(0, limit).join(" ");
}

function cleanBankLine(value: string) {
  return value
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/^\s*(?:[·*•-]|\d+[.)])\s*/, "")
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+\[$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanBankHeadline(value: string) {
  return cleanBankLine(value).replace(/\.$/, "");
}

function cleanBankUrl(value: string) {
  const normalizedUrl = value.replace(/^\[/g, "").replace(/[)\].,;]+$/g, "");
  const duplicatedMarkdownUrl = normalizedUrl.match(
    /^(https?:\/\/.+)\]\(\1$/i,
  );
  const url = duplicatedMarkdownUrl?.[1] ?? normalizedUrl;

  try {
    const parsedUrl = new URL(url);

    Array.from(parsedUrl.searchParams.keys()).forEach((key) => {
      if (key.toLowerCase().startsWith("utm_")) {
        parsedUrl.searchParams.delete(key);
      }
    });

    return parsedUrl.toString();
  } catch {
    return url;
  }
}

function extractBankUrls(value: string) {
  const markdownUrls = Array.from(
    value.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g),
    (match) => match[1],
  );
  const valueWithoutMarkdownLinks = value.replace(
    /\[[^\]]+\]\(https?:\/\/[^)\s]+\)/g,
    "",
  );
  const urls = valueWithoutMarkdownLinks.match(/https?:\/\/[^\s<>"']+/g) ?? [];

  return Array.from(new Set([...markdownUrls, ...urls].map(cleanBankUrl)));
}

function stripBankSourceText(value: string) {
  return value
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\b(?:source(?:\s+link)?|link)\s*:\s*https?:\/\/[^\s<>"']+/gi, "")
    .replace(/\b(?:source(?:\s+link)?|link)\s*:\s*/gi, "")
    .replace(/https?:\/\/[^\s<>"']+/g, "")
    .trim();
}

function normalizeBankCategory(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findBankCategoryLabel(value: string, labels: readonly string[]) {
  const normalizedValue = normalizeBankCategory(value);

  return (
    labels.find((label) => normalizedValue.includes(normalizeBankCategory(label))) ??
    ""
  );
}

function extractBankCategoryLine(value: string) {
  return value.match(/(?:^|\n)\s*category\s*:\s*([^\n]+)/i)?.[1] ?? "";
}

function hasBankCategoryScale(value: string, categoryTotal: number) {
  const categoryLine = extractBankCategoryLine(value);

  return new RegExp(`\\b\\d+\\s*/\\s*${categoryTotal}\\b`).test(
    categoryLine || value,
  );
}

function extractBankDailyFoodCategory(value: string) {
  const categoryLine = extractBankCategoryLine(value);
  const matchedCategory =
    findBankCategoryLabel(categoryLine, dailyFoodCategories) ||
    findBankCategoryLabel(value, dailyFoodCategories);

  return matchedCategory || defaultDailyFoodCategory;
}

function extractBankTheoryCategory(value: string) {
  const categoryLine = extractBankCategoryLine(value);

  return (
    findBankCategoryLabel(categoryLine, theoryCategories.map((category) => category.label)) ||
    findBankCategoryLabel(value, theoryCategories.map((category) => category.label))
  );
}

function detectBankPostCategory(value: string, allowedCategories: BankPostCategory[]) {
  const normalizedValue = value.toLowerCase();
  const dailyFoodCategory = extractBankDailyFoodCategory(value);
  const theoryCategory = extractBankTheoryCategory(value);
  const hasFactsCategoryScale = hasBankCategoryScale(value, 17);
  const hasConspiracyCategoryScale = hasBankCategoryScale(value, 9);
  const dailyFoodSignals = [
    /\bfacts?(?:\s+on\s+news)?\b/.test(normalizedValue),
    hasFactsCategoryScale,
    /\btag\s*1\s*:/i.test(value) && /\bsource\s+link\s*:/i.test(value),
  ].filter(Boolean).length;
  const theorySignals = [
    /\b(?:conspiracy|theor(?:y|ies))\b/.test(normalizedValue),
    hasConspiracyCategoryScale,
    /\bskeptic\s*(?:\/\s*)?debunk(?:\s+evidence)?\s*:/i.test(value),
    Boolean(theoryCategory) && !hasFactsCategoryScale,
  ].filter(Boolean).length;
  const hasDailyFoodAccess = allowedCategories.includes("daily-food");
  const hasTheoryAccess = allowedCategories.includes("theory");

  if (dailyFoodSignals && !theorySignals) {
    return hasDailyFoodAccess
      ? { category: "daily-food" as const, dailyFoodCategory, theoryCategory }
      : { error: "current events route unavailable for this account" };
  }

  if (theorySignals && !dailyFoodSignals) {
    return hasTheoryAccess
      ? { category: "theory" as const, dailyFoodCategory, theoryCategory }
      : { error: "conspiracy route unavailable for this account" };
  }

  if (dailyFoodSignals && theorySignals) {
    if (!hasDailyFoodAccess && hasTheoryAccess) {
      return { category: "theory" as const, dailyFoodCategory, theoryCategory };
    }

    if (hasDailyFoodAccess && !hasTheoryAccess) {
      return { category: "daily-food" as const, dailyFoodCategory, theoryCategory };
    }

    return { error: "post route unclear: current events and conspiracy signals found" };
  }

  if (allowedCategories.length === 1) {
    return {
      category: allowedCategories[0],
      dailyFoodCategory,
      theoryCategory,
    };
  }

  return { error: "post route missing: include Current Events or a Conspiracy category" };
}

function extractBankHeadline(value: string) {
  const headlineMatch = value.match(
    /(?:headline|title)[\s\S]{0,120}?(?:with|:|-)\s*([\s\S]*?)(?=\s+Confirm\b|\n\s*(?:Next\b|Details?\b|Body\b|Tags?\b|Tag\s*\d+|Sources?\b|[·*•-])|$)/i,
  );

  if (headlineMatch?.[1]) {
    return cleanBankHeadline(headlineMatch[1]);
  }

  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const fallbackLine = lines.find((line) => {
    const normalizedLine = line.toLowerCase();

    return (
      !/^https?:\/\//i.test(line) &&
      !/^(facts?(?:\s+on\s+news)?|daily\s*food|theor(?:y|ies)|conspiracy|top\s*story|library)[.!]?$/.test(
        normalizedLine,
      ) &&
      !/^(next|sources?|source links?|details?|body|tags?|topic\s+tags?|category|links?)\b/.test(
        normalizedLine,
      ) &&
      !/^(?:[·*•-]\s*)?(?:for\s+)?tag\s*\d+\b/.test(normalizedLine)
    );
  });

  return fallbackLine ? cleanBankHeadline(fallbackLine) : "";
}

function extractBankTagBlocks(value: string) {
  const tags: { index: number; text: string }[] = [];
  const tagBlockRegex =
    /(?:^|\n)\s*(?:[·*•-]\s*)?Tag\s*(\d+)(?:\s*\([^)]*\))?\s*(?::\s*([^\n]+))?\n?([\s\S]*?)(?=\n\s*(?:[·*•-]\s*)?(?:For\s+Tag\s*\d+|Tag\s*\d+|Source(?:\s+Link)?\s*:|Source\s*\d+|Link\s*:|$))/gi;
  let tagMatch = tagBlockRegex.exec(value);

  while (tagMatch) {
    const tagText = cleanBankLine(
      stripBankSourceText(`${tagMatch[2] ?? ""}\n${tagMatch[3] ?? ""}`),
    );

    if (tagText) {
      tags.push({
        index: Number(tagMatch[1]),
        text: tagText,
      });
    }

    tagMatch = tagBlockRegex.exec(value);
  }

  return tags
    .sort((leftTag, rightTag) => leftTag.index - rightTag.index)
    .map((tag) => tag.text);
}

function extractBankSection(value: string, labels: string[]) {
  const labelPattern = labels.join("|");
  const boundaryLabels = [
    "headline",
    "title",
    "details?",
    "body",
    "theory",
    "post",
    "skeptic\\s*(?:/\\s*)?debunk\\s+link",
    "skeptic\\s*(?:/\\s*)?debunk(?:\\s+evidence)?",
    "links?",
    "sources?",
    "source(?:\\s+link)?",
    "topic\\s+tags?",
    "category",
    "tag\\s*\\d+",
  ].join("|");
  const sectionMatch = value.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:${labelPattern})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${boundaryLabels})\\s*:|$)`,
      "i",
    ),
  );

  return sectionMatch?.[1]?.trim() ?? "";
}

function extractBankDetailLines(value: string) {
  const detailSection = extractBankSection(value, ["details?", "body", "tags?"]);

  if (!detailSection) {
    return [];
  }

  return detailSection
    .split("\n")
    .map((line) => cleanBankLine(stripBankSourceText(line)))
    .filter(
      (line) =>
        line &&
        !/^https?:\/\//i.test(line) &&
        !/^(sources?|source links?|source link|link)\s*:/.test(line),
    );
}

function stripBankSourceLines(value: string) {
  return value
    .split("\n")
    .filter((line) => {
      const trimmedLine = line.trim().toLowerCase();

      return (
        trimmedLine &&
        !/^https?:\/\//i.test(trimmedLine) &&
        !/^(links?|sources?|source links?|skeptic\s*(?:\/\s*)?debunk\s+link)\s*:/.test(
          trimmedLine,
        )
      );
    })
    .join("\n")
    .trim();
}

function extractBankTopicTags(value: string) {
  return cleanBankLine(
    stripBankSourceText(extractBankSection(value, ["topic\\s+tags?"])),
  );
}

function getBankConspiracyBody(value: string, fallbackBody: string) {
  const bodySection = stripBankSourceLines(
    extractBankSection(value, ["body", "theory", "post"]),
  ).slice(0, 10000);
  const skepticDebunkEvidence = stripBankSourceLines(
    extractBankSection(value, [
      "skeptic\\s*(?:/\\s*)?debunk(?:\\s+evidence)?",
    ]),
  );
  const body = bodySection || stripBankSourceLines(fallbackBody).slice(0, 10000);

  return {
    body: [
      body,
      skepticDebunkEvidence
        ? `SKEPTIC / DEBUNK EVIDENCE:\n${skepticDebunkEvidence}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 50000),
    skepticDebunkEvidence,
  };
}

function parseBankPostInput(
  value: string,
  allowedCategories: BankPostCategory[],
): { error?: string; post?: ParsedBankPost } {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { error: "bank box empty" };
  }

  const detectedCategory = detectBankPostCategory(
    trimmedValue,
    allowedCategories,
  );

  if (detectedCategory.error || !detectedCategory.category) {
    return { error: detectedCategory.error ?? "post route missing" };
  }

  const title = extractBankHeadline(trimmedValue).slice(
    0,
    detectedCategory.category === "theory" ? 150 : 75,
  );
  const sources = extractBankUrls(trimmedValue);
  const tagBlocks = extractBankTagBlocks(trimmedValue);
  const detailLines = tagBlocks.length ? tagBlocks : extractBankDetailLines(trimmedValue);
  const tags = detailLines.map((tag) => tag.slice(0, 300)).slice(0, 3);
  const fallbackBody = tags.length
    ? tags.join("\n")
    : stripBankSourceLines(
        trimmedValue
          .replace(/https?:\/\/[^\s<>"']+/g, "")
          .replace(/(?:headline|title)[\s\S]{0,120}?(?:with|:|-)\s*[\s\S]*?(?=\s+Confirm\b|\n|$)/i, ""),
      );
  const conspiracyBody = getBankConspiracyBody(trimmedValue, fallbackBody);
  const body =
    detectedCategory.category === "daily-food"
      ? tags.join("\n")
      : conspiracyBody.body;
  const topicTags = extractBankTopicTags(trimmedValue);

  if (!title) {
    return { error: "headline missing" };
  }

  if (detectedCategory.category === "daily-food" && !tags.length) {
    return { error: "facts tags missing" };
  }

  if (detectedCategory.category === "theory" && !body) {
    return { error: "conspiracy body missing" };
  }

  if (detectedCategory.category === "theory" && !detectedCategory.theoryCategory) {
    return { error: "conspiracy category label missing" };
  }

  return {
    post: {
      body,
      category: detectedCategory.category,
      dailyFoodCategory: detectedCategory.dailyFoodCategory,
      skepticDebunkEvidence: conspiracyBody.skepticDebunkEvidence,
      sources,
      tags,
      theoryCategory: detectedCategory.theoryCategory,
      title,
      topicTags,
    },
  };
}

function getBankPostCategories(allowedCategories: PostCategory[]) {
  const bankCategories: BankPostCategory[] = [];

  if (allowedCategories.includes("daily-food")) {
    bankCategories.push("daily-food");
  }

  if (allowedCategories.includes("theory")) {
    bankCategories.push("theory");
  }

  return bankCategories;
}

export default function BriefingRoomGate({
  initialInboxMember = "",
  initialPanel = "id-card",
  member,
}: BriefingRoomGateProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [resolvedMember, setResolvedMember] = useState(member);
  const [gatePassword, setGatePassword] = useState("");
  const [gateErrorMessage, setGateErrorMessage] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [activePanel, setActivePanel] =
    useState<BriefingPanel>(initialPanel);
  const [targetInboxMember, setTargetInboxMember] =
    useState(initialInboxMember);
  const [savedMember, setSavedMember] = useState<SavedMember | null>(null);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [minimizedDrafts, setMinimizedDrafts] = useState<PostDraft[]>([]);
  const [allPosts, setAllPosts] = useState<BayPost[]>([]);
  const [myPosts, setMyPosts] = useState<BayPost[]>([]);
  const [favoritePostIds, setFavoritePostIds] = useState<string[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});
  const [activeFavoriteCategory, setActiveFavoriteCategory] =
    useState<FavoriteCategory | "">("");
  const [postPreview, setPostPreview] = useState<PostPreviewDraft | null>(null);
  const [postSubmitError, setPostSubmitError] = useState("");
  const [lazyMode, setLazyMode] = useState<LazyAssistantMode>("chat");
  const [lazyResponse, setLazyResponse] = useState("");
  const [lazyBankInput, setLazyBankInput] = useState("");
  const [lazyBankError, setLazyBankError] = useState("");
  const [lazyPostPreview, setLazyPostPreview] =
    useState<PostPreviewDraft | null>(null);
  const [lazyStructuredPreview, setLazyStructuredPreview] = useState<Extract<ThiagoIntake, { kind: "poll" | "quiz" | "quiz-question" }> | null>(null);
  const [isThiagoPublishing, setIsThiagoPublishing] = useState(false);
  const [isLazyAssistantMinimized, setIsLazyAssistantMinimized] =
    useState(false);
  const [lazyShakeTarget, setLazyShakeTarget] = useState<
    "" | "bank-submit"
  >("");
  const [previewWarning, setPreviewWarning] = useState(false);
  const [deletePostId, setDeletePostId] = useState("");
  const [isWipeAllOpen, setIsWipeAllOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [wildCardAccessKey, setWildCardAccessKey] = useState("");
  const [wildCardMessage, setWildCardMessage] = useState("");
  const [isWildCardOpen, setIsWildCardOpen] = useState(false);
  const [isWildCardLoading, setIsWildCardLoading] = useState(false);
  const [memberReferenceNameInput, setMemberReferenceNameInput] = useState("");
  const [memberReferenceNameMessage, setMemberReferenceNameMessage] =
    useState("");
  const [isMemberReferenceNameEditing, setIsMemberReferenceNameEditing] =
    useState(true);
  const [isMemberReferenceNameSaving, setIsMemberReferenceNameSaving] =
    useState(false);
  const [exchangePoints, setExchangePoints] = useState("");
  const [exchangeCoins, setExchangeCoins] = useState("");
  const [exchangeMessage, setExchangeMessage] = useState("");
  const [stampMessage, setStampMessage] = useState("");
  const [postingLock, setPostingLock] = useState<{ shortcut: "post" | "bank" } | null>(null);
  const lockedShortcut = postingLock?.shortcut;
  const [isExchangeLoading, setIsExchangeLoading] = useState(false);
  const [isDailySpinOpen, setIsDailySpinOpen] = useState(false);
  const [isDailySpinLoading, setIsDailySpinLoading] = useState(false);
  const [dailySpinMessage, setDailySpinMessage] = useState("");
  const [hasDailySpinResult, setHasDailySpinResult] = useState(false);

  useEffect(() => {
    if (!postingLock) return;

    const timer = window.setTimeout(() => setPostingLock(null), 6000);
    return () => window.clearTimeout(timer);
  }, [postingLock]);

  useEffect(() => {
    if (!isDailySpinOpen || !hasDailySpinResult) return;

    const timer = window.setTimeout(() => {
      setIsDailySpinOpen(false);
      setDailySpinMessage("");
      setHasDailySpinResult(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isDailySpinOpen, hasDailySpinResult]);
  const [pacificDate, setPacificDate] = useState(getPacificDateKey);
  const hasClaimedDailySpin = savedMember?.dailySpinClaimedOn === pacificDate;

  useEffect(() => {
    const timer = window.setInterval(() => setPacificDate(getPacificDateKey()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const [stampCounts, setStampCounts] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayYear, setBirthdayYear] = useState("");
  const [hasOpenedCryptiAgreement, setHasOpenedCryptiAgreement] =
    useState(false);
  const [hasAcceptedCryptiAgreement, setHasAcceptedCryptiAgreement] =
    useState(false);
  const [isCryptiAgreementAlert, setIsCryptiAgreementAlert] = useState(false);
  const [settingsLinks, setSettingsLinks] = useState<Required<SettingsLinks>>({
    x: { url: "", display: false },
    linkedin: { url: "", display: false },
    github: { url: "", display: false },
    youtube: { url: "", display: false },
  });
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [wipeAccountConfirm, setWipeAccountConfirm] = useState(false);
  const hasHandledCryptiAgreementReturnRef = useRef(false);
  const [postCategory, setPostCategory] = useState<PostCategory>("daily-food");
  const [topStoryStep, setTopStoryStep] = useState(1);
  const [ticker, setTicker] = useState("");
  const [report, setReport] = useState("");
  const [sources, setSources] = useState("");
  const [sourceDrafts, setSourceDrafts] = useState<SourceDraft[]>([]);
  const [dailyFoodHeadline, setDailyFoodHeadline] = useState("");
  const [dailyFoodTag1, setDailyFoodTag1] = useState("");
  const [dailyFoodSource1, setDailyFoodSource1] = useState("");
  const [dailyFoodSourceOpen1, setDailyFoodSourceOpen1] = useState(false);
  const [dailyFoodTag2, setDailyFoodTag2] = useState("");
  const [dailyFoodSource2, setDailyFoodSource2] = useState("");
  const [dailyFoodSourceOpen2, setDailyFoodSourceOpen2] = useState(false);
  const [dailyFoodTag3, setDailyFoodTag3] = useState("");
  const [dailyFoodSource3, setDailyFoodSource3] = useState("");
  const [dailyFoodSourceOpen3, setDailyFoodSourceOpen3] = useState(false);
  const [
    dailyFoodSkepticDebunkEvidence,
    setDailyFoodSkepticDebunkEvidence,
  ] = useState("");
  const [dailyFoodSkepticDebunkSource, setDailyFoodSkepticDebunkSource] =
    useState("");
  const [
    dailyFoodSkepticDebunkSourceOpen,
    setDailyFoodSkepticDebunkSourceOpen,
  ] = useState(false);
  const [dailyFoodCategory, setDailyFoodCategory] = useState(
    defaultDailyFoodCategory,
  );
  const [theoryCategory, setTheoryCategory] = useState(defaultTheoryCategory);
  const [theoryHeadline, setTheoryHeadline] = useState("");
  const [theoryPost, setTheoryPost] = useState("");
  const [theorySkepticDebunkEvidence, setTheorySkepticDebunkEvidence] =
    useState("");
  const [theorySources, setTheorySources] = useState(["", ""]);
  const [libraryTitle, setLibraryTitle] = useState("");
  const [librarySubmission, setLibrarySubmission] = useState("");
  const [librarySources, setLibrarySources] = useState(["", ""]);
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [postIncognito, setPostIncognito] = useState(false);
  const [incognitoShelfLabel, setIncognitoShelfLabel] = useState("");
  const [isIncognitoShelfSet, setIsIncognitoShelfSet] = useState(false);
  const allowedPostCategories = getAllowedPostCategories(savedMember);
  const canUseAnonControls = canUseAnonymousPosting(savedMember);
  const canUseIncogControls = canUseIncognitoPosting(savedMember);
  const canCreatePosts = allowedPostCategories.length > 0;
  const availablePostCategories = postCategories.filter((category) =>
    allowedPostCategories.includes(category.id),
  );
  const defaultPostDraftCategory =
    availablePostCategories[0]?.id ?? "library-submission";
  const activePostCategory = allowedPostCategories.includes(postCategory)
    ? postCategory
    : defaultPostDraftCategory;
  const isBayoClubMember = isBayoClub(savedMember);
  const isCryptiMember = isCrypti(savedMember);
  const isOracleMember = isOracle(savedMember);
  const hasImpossibleBadge = Boolean(
    savedMember?.gateKeys?.includes("impossible-badge"),
  );
  const isImpossibleBadgeEligible = Boolean(
    savedMember?.rank === "graduation" &&
      (savedMember?.cryptiRank === "poster-v" ||
        savedMember?.cryptiRank === "oracle"),
  );
  const isOracleEligible =
    savedMember?.rank === "graduation" &&
    savedMember?.cryptiRank === "poster-v" &&
    !savedMember?.gateKeys?.includes("oracle-badge");
  const isAdminMember = canAccessAdminAnalytics(savedMember);
  const hasCryptiGateKeyOrRank = Boolean(
    savedMember?.gateKeys?.includes("crypti-plus") || savedMember?.cryptiRank,
  );
  const hasAcceptedCurrentCryptiAgreement = Boolean(
    savedMember?.cryptiAgreementAcceptedAt &&
      savedMember.cryptiAgreementVersion === cryptiAgreementVersion,
  );
  const needsCryptiAgreementAcceptance =
    hasCryptiGateKeyOrRank && !hasAcceptedCurrentCryptiAgreement;
  const availableBankCategories = getBankPostCategories(allowedPostCategories);
  const canUseThiago = availableBankCategories.length > 0 || hasImpossibleBadge;
  const isOptionsRoom = isOptionRoomPanel(activePanel);
  const promotionProgress = savedMember
    ? getNextPromotionProgress(savedMember.lifetimePoints ?? 0, savedMember)
    : null;
  const openDrafts = [
    ...minimizedDrafts,
    ...(isPostOpen && activeDraftId
      ? [
          {
            id: activeDraftId,
            postCategory,
            topStoryStep,
            ticker,
            report,
            sources,
            sourceDrafts,
            dailyFoodHeadline,
            dailyFoodTag1,
            dailyFoodSource1,
            dailyFoodSourceOpen1,
            dailyFoodTag2,
            dailyFoodSource2,
            dailyFoodSourceOpen2,
            dailyFoodTag3,
            dailyFoodSource3,
            dailyFoodSourceOpen3,
            dailyFoodSkepticDebunkEvidence,
            dailyFoodSkepticDebunkSource,
            dailyFoodSkepticDebunkSourceOpen,
            dailyFoodCategory,
            theoryCategory,
            theoryHeadline,
            theoryPost,
            theorySkepticDebunkEvidence,
            theorySources,
            libraryTitle,
            librarySubmission,
            librarySources,
            postAnonymously,
            postIncognito,
            incognitoShelfLabel,
            isIncognitoShelfSet,
          },
        ]
      : []),
  ].sort((leftDraft, rightDraft) => leftDraft.id - rightDraft.id);
  const nextDraftId =
    openDrafts.reduce(
      (highestId, draft) => Math.max(highestId, draft.id),
      0,
    ) + 1;
  const openDraftsJson = JSON.stringify(openDrafts);

  function getCurrentDraft(): PostDraft | null {
    if (!activeDraftId) {
      return null;
    }

    return {
      id: activeDraftId,
      postCategory,
      topStoryStep,
      ticker,
      report,
      sources,
      sourceDrafts,
      dailyFoodHeadline,
      dailyFoodTag1,
      dailyFoodSource1,
      dailyFoodSourceOpen1,
      dailyFoodTag2,
      dailyFoodSource2,
      dailyFoodSourceOpen2,
      dailyFoodTag3,
      dailyFoodSource3,
      dailyFoodSourceOpen3,
      dailyFoodSkepticDebunkEvidence,
      dailyFoodSkepticDebunkSource,
      dailyFoodSkepticDebunkSourceOpen,
      dailyFoodCategory,
      theoryCategory,
      theoryHeadline,
      theoryPost,
      theorySkepticDebunkEvidence,
      theorySources,
      libraryTitle,
      librarySubmission,
      librarySources,
      postAnonymously,
      postIncognito,
      incognitoShelfLabel,
      isIncognitoShelfSet,
    };
  }

  function applyPostDraft(draft: PostDraft) {
    setActiveDraftId(draft.id);
    setPostCategory(draft.postCategory);
    setTopStoryStep(draft.topStoryStep);
    setTicker(draft.ticker);
    setReport(draft.report);
    setSources(draft.sources);
    setSourceDrafts(draft.sourceDrafts);
    setDailyFoodHeadline(draft.dailyFoodHeadline);
    setDailyFoodTag1(draft.dailyFoodTag1);
    setDailyFoodSource1(draft.dailyFoodSource1);
    setDailyFoodSourceOpen1(draft.dailyFoodSourceOpen1);
    setDailyFoodTag2(draft.dailyFoodTag2);
    setDailyFoodSource2(draft.dailyFoodSource2);
    setDailyFoodSourceOpen2(draft.dailyFoodSourceOpen2);
    setDailyFoodTag3(draft.dailyFoodTag3);
    setDailyFoodSource3(draft.dailyFoodSource3);
    setDailyFoodSourceOpen3(draft.dailyFoodSourceOpen3);
    setDailyFoodSkepticDebunkEvidence(
      draft.dailyFoodSkepticDebunkEvidence ?? "",
    );
    setDailyFoodSkepticDebunkSource(draft.dailyFoodSkepticDebunkSource ?? "");
    setDailyFoodSkepticDebunkSourceOpen(
      Boolean(draft.dailyFoodSkepticDebunkSourceOpen),
    );
    setDailyFoodCategory(draft.dailyFoodCategory || defaultDailyFoodCategory);
    setTheoryCategory(draft.theoryCategory || defaultTheoryCategory);
    setTheoryHeadline(draft.theoryHeadline);
    setTheoryPost(draft.theoryPost);
    setTheorySkepticDebunkEvidence(draft.theorySkepticDebunkEvidence ?? "");
    setTheorySources(
      Array.isArray(draft.theorySources) && draft.theorySources.length
        ? draft.theorySources
        : ["", ""],
    );
    setLibraryTitle(draft.libraryTitle);
    setLibrarySubmission(draft.librarySubmission);
    setLibrarySources(
      Array.isArray(draft.librarySources) && draft.librarySources.length
        ? draft.librarySources
        : ["", ""],
    );
    setPostAnonymously(draft.postAnonymously);
    setPostIncognito(draft.postIncognito);
    setIncognitoShelfLabel(draft.incognitoShelfLabel);
    setIsIncognitoShelfSet(draft.isIncognitoShelfSet);
    setPostPreview(null);
    setPreviewWarning(false);
    setDeletePostId("");
  }

  function applySettingsFields(memberRecord: SavedMember | null) {
    const hasAcceptedCryptiAgreementRecord = Boolean(
      memberRecord?.cryptiAgreementAcceptedAt &&
        memberRecord.cryptiAgreementVersion === cryptiAgreementVersion,
    );

    setEmail(memberRecord?.email ?? "");
    setBirthdayDay(memberRecord?.birthdayDay ?? "");
    setBirthdayMonth(memberRecord?.birthdayMonth ?? "");
    setBirthdayYear(memberRecord?.birthdayYear ?? "");
    setMemberReferenceNameInput(getEditableMemberReferenceName(memberRecord));
    setMemberReferenceNameMessage("");
    setHasAcceptedCryptiAgreement(hasAcceptedCryptiAgreementRecord);
    setHasOpenedCryptiAgreement(hasAcceptedCryptiAgreementRecord);
    setIsCryptiAgreementAlert(false);
    setSettingsLinks(getSettingsLinks(memberRecord));
  }

  function saveOpenPostDrafts(drafts = openDrafts) {
    if (!resolvedMember) {
      return;
    }

    window.localStorage.setItem(
      `${openPostDraftsStorageKey}:${resolvedMember}`,
      JSON.stringify(drafts),
    );
  }

  const clearOpenPostDrafts = useCallback(() => {
    if (resolvedMember) {
      window.localStorage.removeItem(
        `${openPostDraftsStorageKey}:${resolvedMember}`,
      );
    }

    setMinimizedDrafts([]);
    setActiveDraftId(null);
    setIsPostOpen(false);
  }, [resolvedMember]);

  const returnToBriefingRoom = useCallback(() => {
    setActivePanel("id-card");
    setDeletePostId("");
    setActiveFavoriteCategory("");
    setSettingsMessage("");
    setExchangeMessage("");
    setStampMessage("");
    setPostingLock(null);
    setWildCardMessage("");
    setIsCryptiAgreementAlert(false);
    setIsChangingPassword(false);
    setDeleteAccountConfirm(false);
    setWipeAccountConfirm(false);
  }, []);

  const syncStampCounts = useCallback(async () => {
    const response = await fetch("/api/members?stampCounts=true", {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      counts?: Record<string, number>;
    };

    setStampCounts(data.counts ?? {});
  }, []);

  useEffect(() => {
    const requestedInboxMember = initialInboxMember.trim();

    if (initialPanel !== "inbox" && !requestedInboxMember) {
      return;
    }

    const openPanelTimer = window.setTimeout(() => {
      setActivePanel("inbox");
      setTargetInboxMember(requestedInboxMember);
    }, 0);

    return () => {
      window.clearTimeout(openPanelTimer);
    };
  }, [initialInboxMember, initialPanel]);

  useEffect(() => {
    async function syncActiveMember() {
      setIsCheckingSession(true);

      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = response.ok
          ? ((await response.json()) as { member?: SavedMember | null })
          : { member: null };
        const activeSavedMember = data.member ?? null;
        const activeMember = activeSavedMember?.member ?? "";

        if (activeMember && activeSavedMember) {
          window.localStorage.setItem(activeMemberStorageKey, activeMember);
          setResolvedMember(activeMember);
          setSavedMember(activeSavedMember);
          applySettingsFields(activeSavedMember);
          setIsUnlocked(true);
          return;
        }

        if (response.status !== 401) {
          return;
        }

        clearOpenPostDrafts();
        window.localStorage.removeItem(activeMemberStorageKey);
        setResolvedMember(member);
        const fallbackMember = await fetchSavedMember(member);
        setSavedMember(fallbackMember);
        applySettingsFields(fallbackMember);
        setIsUnlocked(false);
      } finally {
        setIsCheckingSession(false);
      }
    }

    syncActiveMember();
    window.addEventListener("storage", syncActiveMember);
    window.addEventListener("bay-space-auth", syncActiveMember);
    window.addEventListener("pageshow", syncActiveMember);

    return () => {
      window.removeEventListener("storage", syncActiveMember);
      window.removeEventListener("bay-space-auth", syncActiveMember);
      window.removeEventListener("pageshow", syncActiveMember);
    };
  }, [clearOpenPostDrafts, member]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncStampCounts().catch(() => undefined);
    }, 0);

    function handleStampCountsSync() {
      syncStampCounts().catch(() => undefined);
    }

    window.addEventListener("bay-space-auth", handleStampCountsSync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("bay-space-auth", handleStampCountsSync);
    };
  }, [syncStampCounts]);

  useEffect(() => {
    if (
      hasHandledCryptiAgreementReturnRef.current ||
      isCheckingSession ||
      !resolvedMember ||
      !savedMember
    ) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const hasAgreementReadReturn =
      currentUrl.searchParams.get("agreementRead") === "crypti";
    const hasStoredAgreementAcceptance =
      window.localStorage.getItem(cryptiAgreementAcceptedStorageKey) === "true";

    if (!hasAgreementReadReturn && !hasStoredAgreementAcceptance) {
      return;
    }

    hasHandledCryptiAgreementReturnRef.current = true;

    if (!hasAgreementReadReturn) {
      const storedConfirmationTimer = window.setTimeout(() => {
        setHasOpenedCryptiAgreement(true);
        setHasAcceptedCryptiAgreement(true);

        if (hasAcceptedCurrentCryptiAgreement) {
          window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
          return;
        }

        if (!hasCryptiGateKeyOrRank) {
          window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
          return;
        }

        async function saveStoredCryptiAgreementReturn() {
          const response = await fetch(`/api/members/${resolvedMember}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "accept-crypti-agreement" }),
          });
          const data = (await response.json()) as { member?: SavedMember };

          if (!response.ok || !data.member) {
            window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
            return;
          }

          setSavedMember(data.member);
          applySettingsFields(data.member);
          window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
          window.dispatchEvent(new Event("bay-space-auth"));
        }

        saveStoredCryptiAgreementReturn().catch(() => {
          window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
        });
      }, 0);

      return () => {
        window.clearTimeout(storedConfirmationTimer);
      };
    }

    const shouldAcceptCryptiAgreement =
      currentUrl.searchParams.get("cryptiAgreementAccepted") === "true" ||
      hasStoredAgreementAcceptance;

    currentUrl.searchParams.delete("agreementRead");
    currentUrl.searchParams.delete("cryptiAgreementAccepted");
    window.history.replaceState(
      window.history.state,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );

    const handleTimer = window.setTimeout(() => {
      setActivePanel("settings");
      setHasOpenedCryptiAgreement(true);

      if (!shouldAcceptCryptiAgreement) {
        window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
        setHasAcceptedCryptiAgreement(false);
        setIsCryptiAgreementAlert(true);
        setSettingsMessage("confirm +CRYPTI user agreement");
        return;
      }

      setHasAcceptedCryptiAgreement(true);
      setIsCryptiAgreementAlert(false);

      if (hasAcceptedCurrentCryptiAgreement) {
        window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
        setSettingsMessage("+CRYPTI user agreement saved");
        return;
      }

      if (!hasCryptiGateKeyOrRank) {
        setSettingsMessage("+CRYPTI gate key required before agreement save");
        return;
      }

      async function saveCryptiAgreementReturn() {
        setSettingsMessage("saving +CRYPTI user agreement");

        const response = await fetch(`/api/members/${resolvedMember}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "accept-crypti-agreement" }),
        });
        const data = (await response.json()) as { member?: SavedMember };

        if (!response.ok || !data.member) {
          setIsCryptiAgreementAlert(true);
          setSettingsMessage("+CRYPTI agreement confirmation not saved");
          return;
        }

        setSavedMember(data.member);
        applySettingsFields(data.member);
        window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
        setSettingsMessage("+CRYPTI user agreement saved");
        window.dispatchEvent(new Event("bay-space-auth"));
      }

      saveCryptiAgreementReturn().catch(() => {
        setIsCryptiAgreementAlert(true);
        setSettingsMessage("+CRYPTI agreement confirmation not saved");
      });
    }, 0);

    return () => {
      window.clearTimeout(handleTimer);
    };
  }, [
    hasAcceptedCurrentCryptiAgreement,
    hasCryptiGateKeyOrRank,
    isCheckingSession,
    resolvedMember,
    savedMember,
  ]);

  useEffect(() => {
    function handleCryptiAgreementStorage(event: StorageEvent) {
      if (
        event.key !== cryptiAgreementAcceptedStorageKey ||
        event.newValue !== "true"
      ) {
        return;
      }

      setActivePanel("settings");
      setHasOpenedCryptiAgreement(true);
      setHasAcceptedCryptiAgreement(true);
      setIsCryptiAgreementAlert(false);

      if (hasAcceptedCurrentCryptiAgreement) {
        window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
        setSettingsMessage("+CRYPTI user agreement saved");
        return;
      }

      if (!resolvedMember || !savedMember) {
        setSettingsMessage("+CRYPTI agreement confirmation will save on return");
        return;
      }

      async function saveCryptiAgreementFromTab() {
        setSettingsMessage("saving +CRYPTI user agreement");

        const response = await fetch(`/api/members/${resolvedMember}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "accept-crypti-agreement" }),
        });
        const data = (await response.json()) as { member?: SavedMember };

        if (!response.ok || !data.member) {
          setIsCryptiAgreementAlert(true);
          setSettingsMessage("+CRYPTI agreement confirmation not saved");
          return;
        }

        setSavedMember(data.member);
        applySettingsFields(data.member);
        window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
        setSettingsMessage("+CRYPTI user agreement saved");
        window.dispatchEvent(new Event("bay-space-auth"));
      }

      saveCryptiAgreementFromTab().catch(() => {
        setIsCryptiAgreementAlert(true);
        setSettingsMessage("+CRYPTI agreement confirmation not saved");
      });
    }

    window.addEventListener("storage", handleCryptiAgreementStorage);

    return () => {
      window.removeEventListener("storage", handleCryptiAgreementStorage);
    };
  }, [hasAcceptedCurrentCryptiAgreement, resolvedMember, savedMember]);

  useEffect(() => {
    window.addEventListener(
      "bay-space-return-to-briefing-room",
      returnToBriefingRoom,
    );

    return () => {
      window.removeEventListener(
        "bay-space-return-to-briefing-room",
        returnToBriefingRoom,
      );
    };
  }, [returnToBriefingRoom]);

  useEffect(() => {
    let loadDraftsFrame = 0;

    if (!resolvedMember || !isUnlocked) {
      return;
    }

    const savedDrafts = window.localStorage.getItem(
      `${openPostDraftsStorageKey}:${resolvedMember}`,
    );

    if (!savedDrafts) {
      return;
    }

    try {
      const drafts = JSON.parse(savedDrafts) as Partial<PostDraft>[];

      if (Array.isArray(drafts)) {
        loadDraftsFrame = window.requestAnimationFrame(() => {
          setMinimizedDrafts(
            drafts.map((draft, index) =>
              normalizePostDraft(
                draft,
                index + 1,
                defaultPostDraftCategory,
              ),
            ),
          );
        });
      }
    } catch {
      window.localStorage.removeItem(
        `${openPostDraftsStorageKey}:${resolvedMember}`,
      );
    }

    return () => {
      if (loadDraftsFrame) {
        window.cancelAnimationFrame(loadDraftsFrame);
      }
    };
  }, [defaultPostDraftCategory, isUnlocked, resolvedMember]);

  useEffect(() => {
    if (!resolvedMember || !isUnlocked) {
      return;
    }

    window.localStorage.setItem(
      `${openPostDraftsStorageKey}:${resolvedMember}`,
      openDraftsJson,
    );
  }, [isUnlocked, openDraftsJson, resolvedMember]);

  useEffect(() => {
    function syncMyPosts() {
      getBayPosts().then((savedPosts) => {
        setAllPosts(savedPosts);
        setMyPosts(
          savedPosts.filter(
            (post) => post.author === resolvedMember && !isCryptiPost(post),
          ),
        );
      });
    }

    syncMyPosts();
    window.addEventListener("storage", syncMyPosts);
    window.addEventListener(postStoreEvent, syncMyPosts);

    return () => {
      window.removeEventListener("storage", syncMyPosts);
      window.removeEventListener(postStoreEvent, syncMyPosts);
    };
  }, [resolvedMember]);

  useEffect(() => {
    async function syncFavorites() {
      const postIds = myPosts.map((post) => post.id);
      setFavoritePostIds(await getFavoritePostIds());
      setFavoritePostCounts(await countFavoritePosts(postIds));
    }

    syncFavorites();
    window.addEventListener("storage", syncFavorites);
    window.addEventListener(favoriteStoreEvent, syncFavorites);

    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener(favoriteStoreEvent, syncFavorites);
    };
  }, [myPosts]);

  useEffect(() => {
    if (!postPreview) {
      return;
    }

    function warnPreview(event: MouseEvent | PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        previewRef.current &&
        !previewRef.current.contains(target)
      ) {
        event.preventDefault();
        event.stopPropagation();
        setPreviewWarning(false);
        window.requestAnimationFrame(() => setPreviewWarning(true));
      }
    }

    window.addEventListener("pointerdown", warnPreview, true);
    window.addEventListener("click", warnPreview, true);

    return () => {
      window.removeEventListener("pointerdown", warnPreview, true);
      window.removeEventListener("click", warnPreview, true);
    };
  }, [postPreview]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ member: resolvedMember, pin: gatePassword }),
    });
    const data = (await response.json()) as { member?: SavedMember };

    if (response.ok && data.member) {
      window.localStorage.setItem(activeMemberStorageKey, data.member.member);
      setSavedMember(data.member);
      applySettingsFields(data.member);
      window.dispatchEvent(new Event("bay-space-auth"));
      setGateErrorMessage("");
      setGatePassword("");
      setIsUnlocked(true);
      return;
    }

    setGateErrorMessage(
      response.status === 401 ? "try again" : "no account found",
    );
  }

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    clearOpenPostDrafts();
    window.localStorage.removeItem(activeMemberStorageKey);
    window.dispatchEvent(new Event("bay-space-auth"));
    setIsUnlocked(false);
    setActivePanel("id-card");
    setIsChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordChangeMessage("");
    window.location.href = "/";
  }

  function openPostWindow() {
    if (!canCreatePosts) {
      return;
    }

    setPostingLock(null);
    const currentDraft = getCurrentDraft();
    const newDraft = createBlankPostDraft(
      nextDraftId,
      defaultPostDraftCategory,
    );
    setMinimizedDrafts((drafts) =>
      currentDraft ? [...drafts, currentDraft] : drafts,
    );
    applyPostDraft(newDraft);
    setIsPostOpen(true);
    setActivePanel("post");
  }

  function minimizePostWindow() {
    const currentDraft = getCurrentDraft();

    if (!currentDraft) {
      return;
    }

    const nextDrafts = [
      ...minimizedDrafts.filter((draft) => draft.id !== currentDraft.id),
      currentDraft,
    ];
    saveOpenPostDrafts(nextDrafts);
    setMinimizedDrafts((drafts) => [
      ...drafts.filter((draft) => draft.id !== currentDraft.id),
      currentDraft,
    ]);
    setActiveDraftId(null);
    setIsPostOpen(false);
    setActivePanel((panel) => (panel === "post" ? "id-card" : panel));
    setPostPreview(null);
    setPreviewWarning(false);
  }

  useEffect(() => {
    function minimizeBeforeNavigation() {
      minimizePostWindow();
    }

    window.addEventListener("bay-space-minimize-posts", minimizeBeforeNavigation);
    window.addEventListener("pagehide", minimizeBeforeNavigation);

    return () => {
      window.removeEventListener(
        "bay-space-minimize-posts",
        minimizeBeforeNavigation,
      );
      window.removeEventListener("pagehide", minimizeBeforeNavigation);
    };
  });

  function restorePostDraft(draftId: number) {
    const draft = minimizedDrafts.find((postDraft) => postDraft.id === draftId);
    const currentDraft = getCurrentDraft();

    if (!draft) {
      if (activeDraftId === draftId) {
        setActivePanel("post");
      }

      return;
    }

    setMinimizedDrafts((drafts) => [
      ...drafts.filter((postDraft) => postDraft.id !== draftId),
      ...(currentDraft ? [currentDraft] : []),
    ]);
    applyPostDraft(draft);
    setIsPostOpen(true);
    setActivePanel("post");
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreatePosts || !allowedPostCategories.includes(activePostCategory)) {
      return;
    }

    setPostSubmitError("");
    setPostPreview(buildCurrentPost());
  }

  function buildCurrentPost(): PostPreviewDraft {
    const author = resolvedMember || "unknown";
    const canPostAnon = postAnonymously && canUseAnonControls;
    const canPostIncognito = postIncognito && canUseIncogControls;

    if (activePostCategory === "top-story") {
      return {
        category: activePostCategory,
        title: ticker || "untitled top story",
        body: report,
        anonymous: canPostAnon,
        incognito: canPostIncognito,
        author,
        shelfLabel: canPostIncognito ? incognitoShelfLabel : undefined,
        shelfCode: canPostIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          sourceNote: sources,
          sourceLinks: sourceDrafts
            .map((source) => source.link)
            .filter(Boolean),
          sourceConnections: sourceDrafts
            .map((source) => source.connection)
            .filter(Boolean),
        },
      };
    }

    if (activePostCategory === "daily-food") {
      const dateKey = getDateKey();
      const dailyFoodOrder =
        allPosts.filter(
          (post) => post.category === "daily-food" && post.dateKey === dateKey,
        ).length + 1;
      const dailyFoodEntries = [
        { source: dailyFoodSource1, text: dailyFoodTag1 },
        { source: dailyFoodSource2, text: dailyFoodTag2 },
        { source: dailyFoodSource3, text: dailyFoodTag3 },
        {
          source: dailyFoodSkepticDebunkSource,
          text: dailyFoodSkepticDebunkEvidence,
        },
      ]
        .map((entry) => ({
          source: entry.source.trim(),
          text: entry.text.trim(),
        }))
        .filter((entry) => entry.text);
      const dailyFoodSourceList = dailyFoodEntries
        .map((entry) => entry.source)
        .filter(Boolean);

      return {
        category: activePostCategory,
        title: dailyFoodHeadline || "untitled facts post",
        body: dailyFoodEntries.map((entry) => entry.text).join("\n"),
        anonymous: canPostAnon,
        incognito: canPostIncognito,
        author,
        shelfLabel: canPostIncognito ? incognitoShelfLabel : undefined,
        shelfCode: canPostIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          tags: dailyFoodEntries.map((entry) => entry.text),
          tagSources: dailyFoodEntries.map((entry) => entry.source),
          dailyFoodCode: formatDailyFoodCode(dateKey, dailyFoodOrder),
          dailyFoodCategory,
          dailyFoodOrder: dailyFoodOrder.toString(),
          sources: dailyFoodSourceList,
          ...(dailyFoodSkepticDebunkEvidence.trim()
            ? {
                skepticDebunkEvidence: dailyFoodSkepticDebunkEvidence.trim(),
              }
            : {}),
          ...(dailyFoodSkepticDebunkSource.trim()
            ? {
                skepticDebunkSources: [
                  dailyFoodSkepticDebunkSource.trim(),
                ],
              }
            : {}),
        },
      };
    }

    if (activePostCategory === "theory") {
      const skepticDebunkEvidence = theorySkepticDebunkEvidence.trim();
      const theoryBody = [
        theoryPost,
        skepticDebunkEvidence
          ? `SKEPTIC / DEBUNK EVIDENCE:\n${skepticDebunkEvidence}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      return {
        category: activePostCategory,
        title: theoryHeadline || "untitled conspiracy",
        body: theoryBody,
        anonymous: canPostAnon,
        incognito: canPostIncognito,
        author,
        shelfLabel: canPostIncognito ? incognitoShelfLabel : undefined,
        shelfCode: canPostIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          sources: theorySources.map((source) => source.trim()).filter(Boolean),
          ...(skepticDebunkEvidence ? { skepticDebunkEvidence } : {}),
          theoryCategory,
        },
      };
    }

    return {
      category: "library-submission",
      title: libraryTitle || "untitled shelf",
      body: librarySubmission,
      anonymous: canPostAnon,
      incognito: canPostIncognito,
      author,
      shelfLabel: libraryTitle,
      shelfCode: normalizeShelfLabel(libraryTitle),
      meta: {
        sources: librarySources.map((source) => source.trim()).filter(Boolean),
      },
    };
  }

  async function confirmPost() {
    if (
      postPreview &&
      canCreatePosts &&
      allowedPostCategories.includes(postPreview.category)
    ) {
      try {
        setPostSubmitError("");
        await saveBayPost(postPreview);
      } catch (error) {
        setPostSubmitError(
          error instanceof Error ? error.message : "Unable to save post",
        );
        return;
      }
    }

    resetPostDraft();
  }

  function shakeLazyButton() {
    setLazyShakeTarget("");
    window.requestAnimationFrame(() => setLazyShakeTarget("bank-submit"));
  }

  function openLazyBank() {
    setPostingLock(null);
    setLazyPostPreview(null);
    setLazyStructuredPreview(null);
    setLazyBankError("");
    setIsLazyAssistantMinimized(false);
    setActivePanel("lazy-assistant");
    setLazyMode("bank");
    setLazyResponse("");
  }

  function restoreLazyAssistant() {
    setIsLazyAssistantMinimized(false);
    setActivePanel("lazy-assistant");
  }

  function openBlackLight() {
    restoreLazyAssistant();
    setLazyMode("chat");
    setLazyBankError("");
  }

  function showPostingLock(button: HTMLButtonElement, shortcut: "post" | "bank") {
    setPostingLock({ shortcut });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      button.animate(
        [0, -5, 5, -4, 4, 0].map((offset) => ({ transform: `translateX(${offset}px)` })),
        { duration: 300 },
      );
    }
  }

  function minimizeLazyAssistant() {
    setIsLazyAssistantMinimized(true);
    setActivePanel("id-card");
  }

  function wipeLazyAssistant() {
    setLazyMode("chat");
    setLazyResponse("");
    setLazyBankInput("");
    setLazyBankError("");
    setLazyPostPreview(null);
    setLazyStructuredPreview(null);
    setLazyShakeTarget("");
    setIsLazyAssistantMinimized(false);
    setActivePanel("id-card");
  }

  function buildLazyBankPost(parsedPost: ParsedBankPost): PostPreviewDraft | null {
    if (!availableBankCategories.includes(parsedPost.category)) {
      return null;
    }

    const author = resolvedMember || "unknown";

    if (parsedPost.category === "daily-food") {
      const tags = parsedPost.tags.slice(0, 3);
      const tagSources = tags.map((_, index) => parsedPost.sources[index] ?? "");

      return {
        category: "daily-food",
        title: parsedPost.title || "untitled facts post",
        body: tags.join("\n"),
        anonymous: false,
        incognito: false,
        author,
        meta: {
          tags,
          tagSources,
          dailyFoodCategory: parsedPost.dailyFoodCategory,
          sources: parsedPost.sources.filter(Boolean),
          topicTags: parsedPost.topicTags,
        },
      };
    }

    return {
      category: "theory",
      title: parsedPost.title || "untitled conspiracy",
      body: parsedPost.body,
      anonymous: false,
      incognito: false,
      author,
      meta: {
        skepticDebunkEvidence: parsedPost.skepticDebunkEvidence,
        sources: parsedPost.sources.filter(Boolean),
        theoryCategory: parsedPost.theoryCategory,
        topicTags: parsedPost.topicTags,
      },
    };
  }

  async function submitLazyBank() {
    if (isThiagoPublishing) return;

    if (!canUseThiago) {
      setLazyBankError("Thiago engine unavailable");
      shakeLazyButton();
      return;
    }

    let structured: ThiagoIntake | null;
    try { structured = parseThiagoV3(lazyBankInput); }
    catch (error) {
      setLazyBankError(error instanceof Error ? error.message : "Unable to read draft.");
      return;
    }
    if (structured?.kind === "poll" || structured?.kind === "quiz" || structured?.kind === "quiz-question") {
      if (!hasImpossibleBadge) { setLazyBankError("Poll and Quiz authorship is unavailable for this account."); return; }
      if (structured.kind === "quiz-question") {
        setIsThiagoPublishing(true);
        try {
          const response = await fetch("/api/quiz/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "append", question: structured.question }) });
          const body = await response.json() as { message?: string; position?: number };
          if (!response.ok) throw new Error(body.message ?? "Unable to add quiz question.");
          setLazyBankInput(""); setLazyBankError("");
          setLazyResponse(`Thiago: question ${body.position} submitted to the shared quiz draft.`);
          setLazyMode("chat"); setActivePanel("quiz");
        } catch (cause) { setLazyBankError(cause instanceof Error ? cause.message : "Unable to add quiz question."); }
        finally { setIsThiagoPublishing(false); }
        return;
      }
      setLazyStructuredPreview(structured);
      setLazyPostPreview(null);
      setLazyBankError("");
      setLazyMode("preview");
      return;
    }
    if (structured?.kind === "article") {
      if (!availableBankCategories.includes(structured.category)) { setLazyBankError("This article route is unavailable for this account."); return; }
      const nextPreview: PostPreviewDraft = {
        category: structured.category, title: structured.title, body: structured.body,
        anonymous: false, incognito: false, author: resolvedMember || "unknown",
        meta: structured.category === "daily-food"
          ? { tags: structured.tags, tagSources: structured.tagSources, sources: structured.sources, dailyFoodCategory: structured.section, topicTags: structured.topicTags }
          : { sources: structured.sources, theoryCategory: structured.section, topicTags: structured.topicTags, skepticDebunkEvidence: structured.skepticDebunkEvidence },
      };
      setLazyPostPreview(nextPreview);
      setLazyStructuredPreview(null);
      setLazyBankError("");
      setLazyMode("preview");
      return;
    }
    const parsedPost = parseBankPostInput(lazyBankInput, availableBankCategories);

    if (parsedPost.error || !parsedPost.post) {
      setLazyBankError(parsedPost.error ?? "bank parse failed");
      shakeLazyButton();
      return;
    }

    const nextPreview = buildLazyBankPost(parsedPost.post);

    if (!nextPreview) {
      setLazyBankError("Thiago engine unavailable");
      shakeLazyButton();
      return;
    }

    setLazyPostPreview(nextPreview);
    setLazyStructuredPreview(null);
    setLazyBankError("");
    setLazyMode("preview");
  }

  async function confirmLazyBankPost() {
    if (
      lazyPostPreview &&
      canCreatePosts &&
      allowedPostCategories.includes(lazyPostPreview.category)
    ) {
      try {
        await saveBayPost(lazyPostPreview);
      } catch (error) {
        setLazyBankError(
          error instanceof Error ? error.message : "Unable to save post",
        );
        return;
      }
      setLazyPostPreview(null);
      setLazyBankInput("");
      setLazyBankError("");
      setLazyResponse("Thiago: post published");
      setLazyMode("chat");
    }
  }

  function editLazyBankPost() {
    setLazyPostPreview(null);
    setLazyStructuredPreview(null);
    setLazyBankError("");
    setLazyMode("bank");
  }

  async function confirmStructuredIntake() {
    if (!lazyStructuredPreview || !hasImpossibleBadge || isThiagoPublishing) return;
    const preview = lazyStructuredPreview;
    if (preview.kind === "quiz-question") return;
    setIsThiagoPublishing(true);
    setLazyBankError("");
    try {
      const response = await fetch(preview.kind === "poll" ? "/api/polls" : "/api/quiz/draft", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(preview.kind === "poll" ? { question: preview.question, options: preview.options } : { action: "import", draft: preview.draft }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Unable to publish draft.");
      setLazyStructuredPreview(null);
      setLazyBankInput("");
      setLazyResponse(preview.kind === "poll" ? "Thiago: poll staged. Voting opens in two minutes." : "Thiago: questions submitted to the shared quiz draft.");
      setLazyMode("chat");
    } catch (error) {
      setLazyBankError(error instanceof Error ? error.message : "Unable to publish draft.");
    } finally { setIsThiagoPublishing(false); }
  }

  async function wipeAllPosts() {
    await Promise.all(
      myPosts.map((post) => deleteBayPost(post.id)),
    );
    setDeletePostId("");
    setIsWipeAllOpen(false);
  }

  async function togglePostAnonymous(post: BayPost) {
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anonymous: !post.anonymous }),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { post?: BayPost };
    const updatedPost = data.post;

    if (!updatedPost) {
      return;
    }

    setMyPosts((posts) =>
      posts.map((savedPost) =>
        savedPost.id === updatedPost.id ? updatedPost : savedPost,
      ),
    );
    setAllPosts((posts) =>
      posts.map((savedPost) =>
        savedPost.id === updatedPost.id ? updatedPost : savedPost,
      ),
    );
    window.dispatchEvent(new Event(postStoreEvent));
  }

  function editPost() {
    setPostSubmitError("");
    setPostPreview(null);
    setPreviewWarning(false);
  }

  function resetPostDraft() {
    const closingDraftId = activeDraftId;
    const nextDrafts = closingDraftId
      ? minimizedDrafts.filter((draft) => draft.id !== closingDraftId)
      : minimizedDrafts;

    setIsPostOpen(false);
    setActiveDraftId(null);
    setMinimizedDrafts(nextDrafts);
    saveOpenPostDrafts(nextDrafts);
    setActivePanel("id-card");
    setPostCategory(defaultPostDraftCategory);
    setTopStoryStep(1);
    setTicker("");
    setReport("");
    setSources("");
    setSourceDrafts([]);
    setDailyFoodHeadline("");
    setDailyFoodTag1("");
    setDailyFoodSource1("");
    setDailyFoodSourceOpen1(false);
    setDailyFoodTag2("");
    setDailyFoodSource2("");
    setDailyFoodSourceOpen2(false);
    setDailyFoodTag3("");
    setDailyFoodSource3("");
    setDailyFoodSourceOpen3(false);
    setDailyFoodSkepticDebunkEvidence("");
    setDailyFoodSkepticDebunkSource("");
    setDailyFoodSkepticDebunkSourceOpen(false);
    setDailyFoodCategory(defaultDailyFoodCategory);
    setTheoryCategory(defaultTheoryCategory);
    setTheoryHeadline("");
    setTheoryPost("");
    setTheorySkepticDebunkEvidence("");
    setTheorySources(["", ""]);
    setLibraryTitle("");
    setLibrarySubmission("");
    setLibrarySources(["", ""]);
    setPostAnonymously(false);
    setPostIncognito(false);
    setIncognitoShelfLabel("");
    setIsIncognitoShelfSet(false);
    setPostPreview(null);
    setPostSubmitError("");
    setPreviewWarning(false);
    setDeletePostId("");
  }

  function addSourceDraft() {
    setSourceDrafts((drafts) => [
      ...drafts,
      { id: Date.now(), link: "", connection: "" },
    ]);
  }

  function updateSourceDraft(
    id: number,
    field: "link" | "connection",
    value: string,
  ) {
    setSourceDrafts((drafts) =>
      drafts.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    );
  }

  function focusTheorySource(index: number) {
    if (index === theorySources.length - 1 && index >= 1) {
      setTheorySources((drafts) => [...drafts, ""]);
    }
  }

  function updateTheorySource(index: number, value: string) {
    setTheorySources((drafts) =>
      drafts.map((source, sourceIndex) =>
        sourceIndex === index ? value : source,
      ),
    );
  }

  function focusLibrarySource(index: number) {
    if (index === librarySources.length - 1 && index >= 1) {
      setLibrarySources((drafts) => [...drafts, ""]);
    }
  }

  function updateLibrarySource(index: number, value: string) {
    setLibrarySources((drafts) =>
      drafts.map((source, sourceIndex) =>
        sourceIndex === index ? value : source,
      ),
    );
  }

  async function changePassword() {
    if (!savedMember) {
      setPasswordChangeMessage("no account found");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordChangeMessage("fill both boxes");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeMessage("passwords do not match");
      return;
    }

    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: newPassword }),
    });
    const data = (await response.json()) as { member?: SavedMember };

    if (!response.ok || !data.member) {
      setPasswordChangeMessage("password not changed");
      return;
    }

    setSavedMember(data.member);
    setNewPassword("");
    setConfirmPassword("");
    setIsChangingPassword(false);
    setPasswordChangeMessage("password changed");
  }

  function cancelPasswordChange() {
    setIsChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordChangeMessage("");
  }

  function updateSettingsLink(
    key: keyof Required<SettingsLinks>,
    field: keyof PublicProfileLink,
    value: string | boolean,
  ) {
    setSettingsLinks((currentLinks) => ({
      ...currentLinks,
      [key]: {
        ...currentLinks[key],
        [field]: value,
      },
    }));
    setSettingsMessage("");
  }

  function openCryptiAgreement() {
    if (openExternalBrowser(cryptiAgreementHref)) {
      setHasOpenedCryptiAgreement(true);
      setIsCryptiAgreementAlert(false);
      setSettingsMessage("");
      return;
    }

    setSettingsMessage("open +CRYPTI user agreement");
  }

  async function saveCryptiAgreementConfirmation() {
    if (!savedMember) {
      setHasAcceptedCryptiAgreement(false);
      setIsCryptiAgreementAlert(true);
      setSettingsMessage("no account found");
      return;
    }

    setHasOpenedCryptiAgreement(true);
    setHasAcceptedCryptiAgreement(true);
    setIsCryptiAgreementAlert(false);
    setSettingsMessage("saving +CRYPTI user agreement");

    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "accept-crypti-agreement" }),
    });
    const data = (await response.json()) as { member?: SavedMember };

    if (!response.ok || !data.member) {
      setHasAcceptedCryptiAgreement(false);
      setIsCryptiAgreementAlert(true);
      setSettingsMessage("+CRYPTI agreement confirmation not saved");
      return;
    }

    setSavedMember(data.member);
    applySettingsFields(data.member);
    window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
    setSettingsMessage("+CRYPTI user agreement saved");
    window.dispatchEvent(new Event("bay-space-auth"));
  }

  async function saveSettings() {
    if (needsCryptiAgreementAcceptance) {
      if (!hasOpenedCryptiAgreement) {
        setIsCryptiAgreementAlert(true);
        setSettingsMessage("open +CRYPTI user agreement first");
        return;
      }

      if (!hasAcceptedCryptiAgreement) {
        setIsCryptiAgreementAlert(true);
        setSettingsMessage("confirm +CRYPTI user agreement");
        return;
      }
    }

    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "settings",
        settings: {
          email,
          birthdayDay,
          birthdayMonth,
          birthdayYear,
          cryptiAgreementAccepted: needsCryptiAgreementAcceptance
            ? hasAcceptedCryptiAgreement
            : undefined,
          links: settingsLinks,
        },
      }),
    });
    const data = (await response.json()) as { member?: SavedMember; message?: string };

    if (!response.ok || !data.member) {
      setSettingsMessage(data.message ?? "settings not saved");
      return;
    }

    setSavedMember(data.member);
    applySettingsFields(data.member);
    window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
    setSettingsMessage("settings saved");
    window.dispatchEvent(new Event("bay-space-auth"));
  }

  async function runExchangeAction(
    payload: Record<string, unknown>,
    successMessage: string | ((result: { alreadyOwned?: boolean; points?: number }) => string),
    reportMessage = setExchangeMessage,
  ) {
    if (!savedMember) {
      reportMessage("no account found");
      return null;
    }

    setIsExchangeLoading(true);
    reportMessage("");

    try {
      const response = await fetch(`/api/members/${resolvedMember}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        member?: SavedMember;
        message?: string;
        alreadyOwned?: boolean;
        points?: number;
      };

      if (!response.ok || !data.member) {
        reportMessage(data.message ?? "exchange failed");
        return null;
      }

      setSavedMember(data.member);
      applySettingsFields(data.member);
      reportMessage(typeof successMessage === "string" ? successMessage : successMessage(data));
      window.dispatchEvent(new Event("bay-space-auth"));
      return data.member;
    } finally {
      setIsExchangeLoading(false);
    }
  }

  async function exchangePointsForCoins() {
    const points = roundExchangeAmount(exchangePoints, bayoCoinExchangeRate);

    if (!Number.isFinite(points) || points < bayoCoinExchangeRate) {
      setExchangeMessage(`minimum exchange is ${bayoCoinExchangeRate} points`);
      return;
    }

    const exchangedMember = await runExchangeAction(
      {
        action: "exchange-points",
        points,
      },
      "points exchanged for Bayo Coins",
    );
    if (exchangedMember) setExchangePoints("");
  }

  async function claimDailySpin() {
    if (!savedMember || isDailySpinLoading) {
      return;
    }

    setIsDailySpinLoading(true);
    setDailySpinMessage("");
    setHasDailySpinResult(false);

    try {
      const response = await fetch(`/api/members/${resolvedMember}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "daily-spin" }),
      });
      const data = (await response.json()) as {
        dailySpin?: {
          alreadyClaimed?: boolean;
          points?: number;
        };
        member?: SavedMember;
        message?: string;
      };

      if (!response.ok || !data.member || !data.dailySpin) {
        setDailySpinMessage(data.message ?? "spin unavailable");
        return;
      }

      const points = Math.max(0, Math.floor(data.dailySpin.points ?? 0));

      setSavedMember(data.member);
      applySettingsFields(data.member);
      setDailySpinMessage(
        data.dailySpin.alreadyClaimed
          ? `today's spin was +${formatPointCount(points)} points`
          : `you won +${formatPointCount(points)} points`,
      );
      setHasDailySpinResult(true);
      window.dispatchEvent(new Event("bay-space-auth"));
    } catch {
      setDailySpinMessage("spin unavailable");
    } finally {
      setIsDailySpinLoading(false);
    }
  }

  async function saveMemberReferenceName() {
    if (!savedMember) {
      setMemberReferenceNameMessage("no account found");
      return;
    }

    setIsMemberReferenceNameSaving(true);
    setMemberReferenceNameMessage("");

    try {
      const response = await fetch(`/api/members/${resolvedMember}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update-reference-name",
          refName: memberReferenceNameInput,
        }),
      });
      const data = (await response.json()) as {
        member?: SavedMember;
        message?: string;
      };

      if (!response.ok || !data.member) {
        setMemberReferenceNameMessage(
          data.message ?? "code name save failed",
        );
        return;
      }

      setSavedMember(data.member);
      applySettingsFields(data.member);
      setMemberReferenceNameMessage("code name saved");
      setIsMemberReferenceNameEditing(false);
      window.dispatchEvent(new Event("bay-space-auth"));
    } finally {
      setIsMemberReferenceNameSaving(false);
    }
  }

  async function exchangeCoinsForTokens() {
    const coins = roundExchangeAmount(exchangeCoins, bayoTokenExchangeRate);

    if (!Number.isFinite(coins) || coins < bayoTokenExchangeRate) {
      setExchangeMessage(`minimum exchange is ${bayoTokenExchangeRate} coins`);
      return;
    }

    const exchangedMember = await runExchangeAction(
      {
        action: "exchange-coins",
        coins,
      },
      "coins exchanged for tokens",
    );
    if (exchangedMember) setExchangeCoins("");
  }

  async function purchaseGraduation() {
    await runExchangeAction(
      { action: "purchase-graduation" },
      "graduation unlocked",
    );
  }

  async function purchaseGateKey(gateKey: GateKey) {
    const hadCryptiGateKey = Boolean(
      savedMember?.gateKeys?.includes("crypti-plus"),
    );
    const member = await runExchangeAction(
      { action: "purchase-gate-key", gateKey },
      "gate key unlocked",
    );

    if (gateKey !== "crypti-plus" || !member || hadCryptiGateKey) {
      return;
    }

    setActivePanel("settings");
    setHasAcceptedCryptiAgreement(false);
    setIsCryptiAgreementAlert(true);

    const openedAgreement = openExternalBrowser(cryptiAgreementHref);
    setHasOpenedCryptiAgreement(openedAgreement);
    setSettingsMessage(
      openedAgreement
        ? "review +CRYPTI agreement, check the box, then press back"
        : "open +CRYPTI agreement, check the box, then press back",
    );
  }

  async function purchaseCard(card: BayoCardId) {
    await runExchangeAction(
      { action: "purchase-card", card },
      "card unlocked",
    );
  }

  async function toggleCard(card: BayoCardId) {
    await runExchangeAction(
      { action: "toggle-card", card },
      "card loadout updated",
    );
  }

  async function purchaseStamp(stamp: BayoStampId) {
    const wasAlreadyOwned = Boolean(savedMember?.bayoStamps?.includes(stamp));
    const member = await runExchangeAction(
      { action: "purchase-stamp", stamp },
      ({ alreadyOwned, points }) => alreadyOwned
        ? "Stamp already owned."
        : points
          ? `Stamp added. +${formatPointCount(points)} points.`
          : "Stamp added.",
      setStampMessage,
    );

    if (member && !wasAlreadyOwned) {
      await syncStampCounts().catch(() => undefined);
    }
  }

  async function unlockWildCard() {
    if (!savedMember) {
      setWildCardMessage("no account found");
      return;
    }

    if (!wildCardAccessKey.trim()) {
      setWildCardMessage("access key required");
      return;
    }

    setIsWildCardLoading(true);
    setWildCardMessage("");

    try {
      if (isImpossibleBadgeEligible && !hasImpossibleBadge) {
        const impossibleResponse = await fetch(
          `/api/members/${resolvedMember}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              accessKey: wildCardAccessKey,
              action: "authorize-impossible-badge",
            }),
          },
        );
        const impossibleData = (await impossibleResponse.json()) as {
          member?: SavedMember;
        };

        if (impossibleResponse.ok && impossibleData.member) {
          setSavedMember(impossibleData.member);
          applySettingsFields(impossibleData.member);
          setWildCardAccessKey("");
          setWildCardMessage("private authorization accepted");
          window.dispatchEvent(new Event("bay-space-auth"));
          return;
        }
      }

      const response = await fetch(`/api/members/${resolvedMember}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accessKey: wildCardAccessKey,
          action: "wild-card",
        }),
      });
      const data = (await response.json()) as {
        member?: SavedMember;
        message?: string;
        wildCard?: {
          pointAward?: number;
          rank?: string;
          tokenAward?: number;
        };
      };

      if (!response.ok || !data.member) {
        setWildCardMessage(
          response.status === 403
            ? "access key rejected"
            : data.message ?? "wild card missed",
        );
        return;
      }

      setSavedMember(data.member);
      applySettingsFields(data.member);
      setWildCardAccessKey("");
      const pointAward = formatPointCount(
        data.wildCard?.pointAward ?? data.member.availablePoints,
      );
      const tokenAward = data.wildCard?.tokenAward;
      setWildCardMessage(
        tokenAward
          ? `wild card accepted - ${pointAward} points + ${formatPointCount(tokenAward)} tokens loaded`
          : `wild card accepted - ${pointAward} points loaded`,
      );
      window.dispatchEvent(new Event("bay-space-auth"));
    } finally {
      setIsWildCardLoading(false);
    }
  }

  async function claimImpossibleBadge() {
    if (!savedMember?.impossibleBadgeReady || hasImpossibleBadge) {
      return;
    }

    setIsWildCardLoading(true);
    setWildCardMessage("");
    try {
      const response = await fetch(`/api/members/${resolvedMember}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "purchase-impossible-badge" }),
      });
      const data = (await response.json()) as {
        member?: SavedMember;
        message?: string;
      };

      if (!response.ok || !data.member) {
        setWildCardMessage(data.message ?? "badge unavailable");
        return;
      }

      setSavedMember(data.member);
      applySettingsFields(data.member);
      setWildCardMessage("IMPOSSIBLE badge acquired");
      window.dispatchEvent(new Event("bay-space-auth"));
    } finally {
      setIsWildCardLoading(false);
    }
  }

  async function wipeAccount() {
    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "wipe-account" }),
    });

    if (!response.ok) {
      setSettingsMessage("wipe failed");
      return;
    }

    window.dispatchEvent(new Event(postStoreEvent));
    setMyPosts([]);
    setAllPosts((posts) =>
      posts.filter((post) => post.author !== resolvedMember),
    );
    setWipeAccountConfirm(false);
    setDeleteAccountConfirm(false);
    setSettingsMessage("account wiped");
  }

  async function deleteAccount() {
    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setSettingsMessage("delete failed");
      return;
    }

    await fetch("/api/logout", { method: "POST" });
    window.localStorage.removeItem(activeMemberStorageKey);
    window.dispatchEvent(new Event("bay-space-auth"));
    window.dispatchEvent(new Event(postStoreEvent));
    window.location.href = "/";
  }

  function getPostHref(post: BayPost) {
    if (post.category === "top-story") {
      return `/news/post?id=${post.id}`;
    }

    if (post.category === "daily-food") {
      if (post.incognito && post.shelfCode) {
        return "/facts-on-news";
      }

      return `/facts-on-news#post-${post.id}`;
    }

    if (post.category === "theory") {
      return `/theories#post-${post.id}`;
    }

    return `/library#library-${post.id}`;
  }

  function getPostSources(post: Pick<BayPost, "meta">) {
    const sourceLinks = post.meta?.sourceLinks;
    const sources = post.meta?.sources;
    const theorySource = post.meta?.source;

    return [
      ...(Array.isArray(sourceLinks) ? sourceLinks : []),
      ...(Array.isArray(sources) ? sources : []),
      ...(typeof theorySource === "string" && theorySource
        ? [theorySource]
        : []),
    ];
  }

  function getSourceHref(source: string) {
    return source.startsWith("http://") || source.startsWith("https://")
      ? source
      : `https://${source}`;
  }

  function getFavoritePosts(category: FavoriteCategory) {
    const favoritePosts = allPosts.filter((post) => {
      if (!favoritePostIds.includes(post.id)) {
        return false;
      }

      if (category === "library-submission") {
        return post.category === "library-submission" || Boolean(post.shelfCode);
      }

      return post.category === category;
    });

    if (category === "library-submission") {
      return favoritePosts.sort((leftPost, rightPost) =>
        leftPost.title.localeCompare(rightPost.title),
      );
    }

    return favoritePosts.sort(
      (leftPost, rightPost) =>
        new Date(rightPost.createdAt).getTime() -
        new Date(leftPost.createdAt).getTime(),
    );
  }

  const isComposingPost = isPostOpen && activePanel === "post";
  const header = isOptionsRoom || isComposingPost ? null : (
    <div className={`${styles.gateHeader} w-full max-w-4xl`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className={`${styles.gateTitle} font-mono text-4xl font-black uppercase sm:text-6xl`}>
          briefing room
        </h1>
        {isUnlocked && (savedMember || canCreatePosts) ? (
          <div className="flex flex-col items-center gap-2">
            {savedMember ? (
              <button
                type="button"
                aria-label={hasClaimedDailySpin ? "Daily spin used today" : "Open daily spin"}
                aria-expanded={isDailySpinOpen}
                onClick={() => {
                  setIsDailySpinOpen((isOpen) => !isOpen);
                  setDailySpinMessage("");
                  setHasDailySpinResult(false);
                }}
                className={styles.dailySpinIcon}
                data-spin-available={!hasClaimedDailySpin}
              >
                🎰
              </button>
            ) : null}
            <button
                type="button"
                onClick={(event) => canCreatePosts
                  ? openPostWindow()
                  : showPostingLock(event.currentTarget, "post")}
                aria-expanded={!canCreatePosts ? lockedShortcut === "post" : undefined}
                className="border border-[#39ff14] bg-[#031403] px-2.5 py-1.5 font-mono text-xs font-black uppercase tracking-[0.14em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              📝 Create a post
            </button>
            <button
                type="button"
                onClick={(event) => canUseThiago
                  ? openLazyBank()
                  : showPostingLock(event.currentTarget, "bank")}
                aria-expanded={!canUseThiago ? lockedShortcut === "bank" : undefined}
                className="border border-dashed border-[#39ff14] bg-black px-2.5 py-1.5 text-xs font-black tracking-[0.14em] text-[#39ff14] shadow-[0_0_14px_rgba(57,255,20,0.22)] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                aria-label="Open 🌀 PASTE & GO 🎢"
                title="🌀 PASTE & GO 🎢"
            >
              🌀 PASTE &amp; GO 🎢
            </button>
            {(lockedShortcut === "post" && !canCreatePosts) ||
            (lockedShortcut === "bank" && !canUseThiago) ? (
              <div className={styles.postingLock}>
                <p role="status">
                  Earn 1,000 lifetime points to rank up to Poster I. Earn points by participating.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {isUnlocked && savedMember && isDailySpinOpen ? (
        <div className={styles.dailySpinWindow}>
          <div>
            <p className={styles.dailySpinEyebrow}>once every day</p>
            <p className={styles.dailySpinTitle}>Daily Spin</p>
            <p className={styles.dailySpinRange}>
              Win 50–500 points
            </p>
          </div>
          <button
            type="button"
            onClick={claimDailySpin}
            disabled={isDailySpinLoading}
            className={styles.dailySpinButton}
          >
            {isDailySpinLoading ? "spinning..." : "spin"}
          </button>
          {dailySpinMessage ? (
            <p className={styles.dailySpinResult} role="status">
              {dailySpinMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      {isUnlocked && (canCreatePosts || isLazyAssistantMinimized) ? (
        <div className="mt-6 flex flex-wrap items-end gap-2">
          {canCreatePosts
            ? openDrafts.map((draft) => (
            <button
              key={draft.id}
              type="button"
              onClick={() => restorePostDraft(draft.id)}
              className={`border-2 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] ${
                activePanel === "post" && activeDraftId === draft.id
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              post {draft.id} - [open]
            </button>
              ))
            : null}
          {isLazyAssistantMinimized ? (
            <button
              type="button"
              onClick={restoreLazyAssistant}
              className="border-2 border-[#1d7f12] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#39ff14]"
            >
              Black Light - [open]
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (isUnlocked) {
    return (
      <div className={styles.gate}>
        {header}
        <div
          className={`${styles.workspace} ${isOptionsRoom || isComposingPost ? "mt-0" : "mt-10"} grid w-full max-w-4xl gap-6 ${
            isComposingPost || isOptionsRoom
              ? ""
              : "md:grid-cols-[220px_1fr]"
          }`}
        >
        {isComposingPost || isOptionsRoom ? null : (
        <aside className={`${styles.optionsRail} order-2 border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)] md:order-1`}>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            options
          </p>
          <div className="mt-4 grid gap-3 text-sm font-black uppercase tracking-[0.12em] text-[#39ff14]">
            <button
              onClick={() => setActivePanel("inbox")}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "inbox"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              inbox
            </button>
            <button
              onClick={() => setActivePanel("quiz")}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] ${activePanel === "quiz" ? "border-[#39ff14] bg-[#39ff14] text-black" : "border-[#1d7f12] text-[#39ff14]"}`}
            >
              QUIZ
            </button>
            <button
              onClick={() => {
                setActivePanel("favorites");
                setActiveFavoriteCategory("");
              }}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "favorites"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              favorites
            </button>
            <button
              onClick={() => setActivePanel("stats")}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "stats"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              stats
            </button>
            <button
              onClick={() => {
                setActivePanel("my-posts");
                setDeletePostId("");
              }}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "my-posts"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              my posts
            </button>
            {savedMember ? (
              <details className="min-w-0">
                <summary className="cursor-pointer border px-3 py-2">ID Card</summary>
                <div className="mt-3 min-w-0 break-words px-1">
                  <p className="font-mono text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                    EXPLORER NUMBER - #{savedMember.member}
                  </p>
                  <div className="mt-4 grid max-w-md gap-2">
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      <span>CODE NAME</span>
                      <input
                        value={memberReferenceNameInput}
                        disabled={!isMemberReferenceNameEditing}
                        onChange={(event) => {
                          setMemberReferenceNameInput(
                            event.target.value.slice(0, 24),
                          );
                          setMemberReferenceNameMessage("");
                        }}
                        placeholder={savedMember.name}
                        className="w-full min-w-0 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14] disabled:text-[#7f9f78]"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isMemberReferenceNameEditing) {
                            setIsMemberReferenceNameEditing(true);
                            setMemberReferenceNameMessage("");
                            return;
                          }

                          void saveMemberReferenceName();
                        }}
                        disabled={isMemberReferenceNameSaving}
                        className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent"
                      >
                        {isMemberReferenceNameSaving
                          ? "saving"
                          : isMemberReferenceNameEditing
                            ? "save"
                            : "edit"}
                      </button>
                      {memberReferenceNameMessage ? (
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                          {memberReferenceNameMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                    RANK: LEVEL {isOracleMember ? 9 : getBayRankLevel(savedMember.rank)} -{" "}
                    {isOracleMember ? "Oracle" : getBayRankLabel(savedMember.rank)}
                  </p>
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#72d7ff]">
                    {isOracleMember
                      ? "+CRYPTI PATH: POSTER V COMPLETE"
                      : `+CRYPTI RANK: ${getCryptiRankLabel(savedMember.cryptiRank) || "-"}`}
                  </p>
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                    LIFETIME POINTS: {formatPointCount(savedMember.lifetimePoints)}
                  </p>
                  {isOracleEligible ? (
                    <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#b6d88f]">
                      FINAL PROMOTION: ORACLE BADGE REQUIRED
                    </p>
                  ) : promotionProgress ? (
                    <p
                      className={`mt-4 text-sm font-black uppercase tracking-[0.2em] ${
                        promotionProgress.track === "crypti"
                          ? "text-[#72d7ff]"
                          : "text-[#d7ffd0]"
                      }`}
                    >
                      POINTS UNTIL {promotionProgress.label}:{" "}
                      <span className="text-[#39ff14]">{formatPointCount(promotionProgress.pointsUntil)}</span>
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      POINTS UNTIL NEXT PROMOTION: <span className="text-[#39ff14]">0</span>
                    </p>
                  )}
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                    NAME: {savedMember.name}
                    {isOracleMember ? " 🔮" : isBayoClubMember ? " 🦉" : ""}
                  </p>
                  <TicketVoteCounter />
                </div>
              </details>
            ) : null}
            <Link
              href={`/profile/${resolvedMember}`}
              className="border border-[#1d7f12] px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)]"
            >
              Profile
            </Link>
            <button
              onClick={openBlackLight}
              className={`border px-3 py-2 text-left normal-case transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "lazy-assistant"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              Black Light
            </button>
            <button
              onClick={() => {
                setActivePanel("settings");
                setSettingsMessage("");
                setWildCardMessage("");
                setDeleteAccountConfirm(false);
                setWipeAccountConfirm(false);
              }}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "settings"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              settings
            </button>
            <button
              onClick={signOut}
              className="border border-[#ff3b3b] px-3 py-2 text-left text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black hover:shadow-[0_0_12px_rgba(255,59,59,0.45)] focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
            >
              sign out
            </button>
          </div>
        </aside>
        )}
        <section
          key={`${activePanel}:${activeDraftId ?? "room"}`}
          className={`${styles.panelSurface} briefing-panel-surface border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)] ${
            isComposingPost || isOptionsRoom
              ? "order-1"
              : "order-1 md:order-2"
          }`}
        >
          {isOptionsRoom ? (
            <button
              type="button"
              onClick={returnToBriefingRoom}
              className="mb-5 w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              back to briefing room
            </button>
          ) : null}
          {activePanel === "post" && isPostOpen ? (
            postPreview ? (
              <div
                ref={previewRef}
                onAnimationEnd={() => setPreviewWarning(false)}
                className={
                  previewWarning ? "animate-[option-shake_180ms_linear]" : ""
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                    preview
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={minimizePostWindow}
                      className="grid h-7 w-7 place-items-center border border-[#1d7f12] text-sm font-black text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                      aria-label="Minimize post window"
                      title="Minimize"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={resetPostDraft}
                      className="grid h-7 w-7 place-items-center border border-[#ff3b3b] text-sm font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                      aria-label="Wipe post window"
                      title="Wipe"
                    >
                      x
                    </button>
                  </div>
                </div>
                <article className="mt-5 border-2 border-[#1d7f12] px-4 py-4">
                  {postPreview.category === "daily-food" &&
                  typeof postPreview.meta?.dailyFoodOrder === "string" ? (
                    <p className="float-right text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                      #{postPreview.meta.dailyFoodOrder}
                    </p>
                  ) : null}
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                    {getDailyFoodCategoryLabel(postPreview)}
                  </p>
                  {(postPreview.anonymous || savedMember?.name) ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      {postPreview.anonymous ? "classified" : savedMember?.name}
                    </p>
                  ) : null}
                  {typeof postPreview.meta?.dailyFoodCode === "string" ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                      {postPreview.meta.dailyFoodCode}
                    </p>
                  ) : null}
                  <h2 className="mt-3 text-xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
                    {postPreview.title}
                  </h2>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#d7ffd0]">
                    {postPreview.body || "no body entered"}
                  </p>
                  {getPostSources(postPreview).length ? (
                    <div className="mt-5 border-t border-[#1d7f12] pt-3">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                        SOURCES
                      </p>
                      <div className="mt-2 grid gap-2 text-xs">
                        {getPostSources(postPreview).map((source) => (
                          <a
                            key={source}
                            href={getSourceHref(source)}
                            className="break-all text-[#d7ffd0] underline decoration-[#39ff14] underline-offset-4"
                          >
                            {source}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {getPostTopicTags(postPreview).length ? (
                    <div className="mt-5 border-t border-[#1d7f12] pt-3">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                        TAGS
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getPostTopicTags(postPreview).map((tag) => (
                          <span
                            key={tag}
                            className="border border-[#1d7f12] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#39ff14]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
                {postSubmitError ? (
                  <p className="mt-4 border border-[#ff3b3b] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#ff6b6b]">
                    {postSubmitError}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={confirmPost}
                    className={`border-2 border-[#39ff14] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.55)] transition hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_18px_rgba(57,255,20,0.72)] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                      previewWarning
                        ? "animate-[preview-confirm-flash_500ms_ease-in-out_2]"
                        : ""
                    }`}
                  >
                    confirm
                  </button>
                  <button
                    type="button"
                    onClick={editPost}
                    className="border border-[#1d7f12] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    edit
                  </button>
                  {postPreview.shelfCode ? (
                    <p className="border border-[#1d7f12] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                      reference code :{" "}
                      <span className="text-[#39ff14]">
                        {postPreview.shelfCode}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <form onSubmit={submitPost}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                  post window
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={minimizePostWindow}
                    className="grid h-7 w-7 place-items-center border border-[#1d7f12] text-sm font-black text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    aria-label="Minimize post window"
                    title="Minimize"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={resetPostDraft}
                    className="grid h-7 w-7 place-items-center border border-[#ff3b3b] text-sm font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                    aria-label="Wipe post window"
                    title="Wipe"
                  >
                    x
                  </button>
                </div>
              </div>
              <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Choose post type</legend>
                {hasImpossibleBadge ? (
                  <Link
                    href="/polls?create=1"
                    className="relative flex items-center gap-5 overflow-visible border border-[#90d587] bg-[#72c16a]/12 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#dce9d9] shadow-[0_0_18px_rgba(114,193,106,0.28)] transition hover:bg-[#72c16a]/22"
                  >
                    <span className="relative block h-4 w-4 shrink-0 rounded-full border border-[#90d587] bg-[#72c16a] shadow-[0_0_10px_rgba(114,193,106,0.55)]" />
                    <span>Poll</span>
                  </Link>
                ) : null}
                {availablePostCategories.map((category) => (
                  <label
                    key={category.id}
                    className={`relative flex items-center gap-5 overflow-visible border bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0] transition ${
                      activePostCategory === category.id
                        ? "border-[#39ff14] shadow-[0_0_18px_rgba(57,255,20,0.42)]"
                        : "border-[#1d7f12]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="post-category"
                      checked={activePostCategory === category.id}
                      onChange={() => {
                        setPostCategory(category.id);
                        setTopStoryStep(1);
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className="relative z-10 block h-4 w-4 shrink-0 rounded-full border border-[#d7ffd0] bg-[#f8fff7] shadow-[0_0_7px_rgba(255,255,255,0.45)] peer-checked:border-[#39ff14] peer-checked:bg-[#39ff14] peer-checked:shadow-[0_0_10px_rgba(57,255,20,0.65)] after:absolute after:left-1/2 after:top-1/2 after:hidden after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-[#d7ffd0] peer-checked:after:block"
                      aria-hidden="true"
                    />
                    <span className="relative z-0">{category.label}</span>
                  </label>
                ))}
              </fieldset>

              {activePostCategory === "top-story" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      scrolling ticker{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({100 - ticker.length})
                      </span>
                    </span>
                    <textarea
                      value={ticker}
                      onChange={(event) =>
                        setTicker(event.target.value.slice(0, 100))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  {topStoryStep < 2 ? (
                    <button
                      type="button"
                      onClick={() => setTopStoryStep(2)}
                      className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      next
                    </button>
                  ) : null}

                  {topStoryStep >= 2 ? (
                    <>
                      <label className="grid gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                          Report:{" "}
                          <span className="text-xs text-[#7f9f78]">
                            ({1200 - report.length})
                          </span>
                        </span>
                        <textarea
                          value={report}
                          onChange={(event) =>
                            setReport(event.target.value.slice(0, 1200))
                          }
                          onInput={(event) => expandTextarea(event.currentTarget)}
                          rows={1}
                          className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                      {topStoryStep < 3 ? (
                        <button
                          type="button"
                          onClick={() => setTopStoryStep(3)}
                          className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                        >
                          next
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  {topStoryStep >= 3 ? (
                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                          source notes
                        </span>
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                          optional source notes connecting article
                        </span>
                        <select
                          value={sources}
                          onChange={(event) => setSources(event.target.value)}
                          className="min-h-[3rem] w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        >
                          <option value="">select source note</option>
                          <option value="primary source">primary source</option>
                          <option value="context source">context source</option>
                          <option value="supporting source">
                            supporting source
                          </option>
                          <option value="source connection unclear">
                            source connection unclear
                          </option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={addSourceDraft}
                        className="w-fit border border-[#39ff14] px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                      >
                        Add source
                      </button>
                      {sourceDrafts.map((source) => (
                        <div
                          key={source.id}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          <input
                            value={source.link}
                            onChange={(event) =>
                              updateSourceDraft(
                                source.id,
                                "link",
                                event.target.value,
                              )
                            }
                            placeholder="[link]"
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                          />
                          <input
                            value={source.connection}
                            onChange={(event) =>
                              updateSourceDraft(
                                source.id,
                                "connection",
                                event.target.value,
                              )
                            }
                            placeholder="[connection to article]"
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activePostCategory === "daily-food" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      headline{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({75 - dailyFoodHeadline.length})
                      </span>
                    </span>
                    <textarea
                      value={dailyFoodHeadline}
                      onChange={(event) =>
                        setDailyFoodHeadline(event.target.value.slice(0, 75))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>

                  {[
                    {
                      label: "Supporting summary 1",
                      value: dailyFoodTag1,
                      setValue: setDailyFoodTag1,
                      source: dailyFoodSource1,
                      setSource: setDailyFoodSource1,
                      sourceOpen: dailyFoodSourceOpen1,
                      setSourceOpen: setDailyFoodSourceOpen1,
                    },
                    {
                      label: "Supporting summary 2",
                      value: dailyFoodTag2,
                      setValue: setDailyFoodTag2,
                      source: dailyFoodSource2,
                      setSource: setDailyFoodSource2,
                      sourceOpen: dailyFoodSourceOpen2,
                      setSourceOpen: setDailyFoodSourceOpen2,
                    },
                    {
                      label: "Supporting summary 3",
                      value: dailyFoodTag3,
                      setValue: setDailyFoodTag3,
                      source: dailyFoodSource3,
                      setSource: setDailyFoodSource3,
                      sourceOpen: dailyFoodSourceOpen3,
                      setSourceOpen: setDailyFoodSourceOpen3,
                    },
                  ].map((tag) => (
                    <div key={tag.label} className="grid gap-3">
                      <label className="grid gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                          {tag.label}{" "}
                          <span className="text-xs text-[#7f9f78]">
                            ({150 - tag.value.length})
                          </span>
                        </span>
                        <textarea
                          value={tag.value}
                          onChange={(event) =>
                            tag.setValue(event.target.value.slice(0, 150))
                          }
                          onInput={(event) => expandTextarea(event.currentTarget)}
                          rows={1}
                          className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                      {tag.sourceOpen ? (
                        <label className="grid gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                            Source - link
                          </span>
                          <input
                            value={tag.source}
                            onChange={(event) =>
                              tag.setSource(event.target.value)
                            }
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                          />
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => tag.setSourceOpen(true)}
                          className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                        >
                          add source
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                        SKEPTIC, DEBUNK, ANTI-THESIS [optional]{" "}
                        <span className="text-xs text-[#7f9f78]">
                          ({1000 - dailyFoodSkepticDebunkEvidence.length})
                        </span>
                      </span>
                      <textarea
                        value={dailyFoodSkepticDebunkEvidence}
                        onChange={(event) =>
                          setDailyFoodSkepticDebunkEvidence(
                            event.target.value.slice(0, 1000),
                          )
                        }
                        onInput={(event) => expandTextarea(event.currentTarget)}
                        rows={1}
                        className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                      />
                    </label>
                    {dailyFoodSkepticDebunkSourceOpen ? (
                      <label className="grid gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                          Source - link
                        </span>
                        <input
                          value={dailyFoodSkepticDebunkSource}
                          onChange={(event) =>
                            setDailyFoodSkepticDebunkSource(event.target.value)
                          }
                          className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDailyFoodSkepticDebunkSourceOpen(true)}
                        className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                      >
                        ADD SOURCE
                      </button>
                    )}
                  </div>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      category
                    </span>
                    <select
                      value={dailyFoodCategory}
                      onChange={(event) =>
                        setDailyFoodCategory(event.target.value)
                      }
                      className="min-h-[3rem] w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    >
                      {dailyFoodCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {activePostCategory === "theory" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid max-w-sm gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      conspiracy category
                    </span>
                    <select
                      value={theoryCategory}
                      onChange={(event) => setTheoryCategory(event.target.value)}
                      className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.14em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    >
                      {theoryCategories.map((category) => (
                        <option key={category.label} value={category.label}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      headline{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({75 - theoryHeadline.length})
                      </span>
                    </span>
                    <input
                      value={theoryHeadline}
                      onChange={(event) =>
                        setTheoryHeadline(event.target.value.slice(0, 75))
                      }
                      className="min-h-[3rem] w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      body{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({50000 - theoryPost.length})
                      </span>
                    </span>
                    <textarea
                      value={theoryPost}
                      onChange={(event) =>
                        setTheoryPost(event.target.value.slice(0, 50000))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      SKEPTIC / DEBUNK EVIDENCE (1000) - [optional]{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({1000 - theorySkepticDebunkEvidence.length})
                      </span>
                    </span>
                    <textarea
                      value={theorySkepticDebunkEvidence}
                      onChange={(event) =>
                        setTheorySkepticDebunkEvidence(
                          event.target.value.slice(0, 1000),
                        )
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      sources
                    </span>
                    <div className="grid gap-2">
                      {theorySources.map((source, index) => (
                        <label
                          key={index}
                          className="grid grid-cols-[1.5rem_1fr] items-center gap-2"
                        >
                          <span className="text-lg font-black text-[#7f9f78]">
                            +
                          </span>
                          <input
                            value={source}
                            onFocus={() => focusTheorySource(index)}
                            onChange={(event) =>
                              updateTheorySource(index, event.target.value)
                            }
                            placeholder="[source]"
                            className="h-11 border border-transparent bg-black px-0 py-2 text-sm font-black text-[#39ff14] caret-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:border-[#39ff14] focus:bg-[#001100] focus:px-3 focus:shadow-[inset_0_-0.55rem_0_rgba(57,255,20,0.28)]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {activePostCategory === "library-submission" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      shelf label{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({75 - libraryTitle.trim().split(/\s+/).filter(Boolean).length})
                      </span>
                    </span>
                    <input
                      value={libraryTitle}
                      onChange={(event) =>
                        setLibraryTitle(limitWords(event.target.value, 75))
                      }
                      className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      library submission{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({50000 - librarySubmission.length})
                      </span>
                    </span>
                    <textarea
                      value={librarySubmission}
                      onChange={(event) =>
                        setLibrarySubmission(event.target.value.slice(0, 50000))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={7}
                      className="min-h-[11rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      sources
                    </span>
                    <div className="grid gap-2">
                      {librarySources.map((source, index) => (
                        <label
                          key={index}
                          className="grid grid-cols-[1.5rem_1fr] items-center gap-2"
                        >
                          <span className="text-lg font-black text-[#7f9f78]">
                            +
                          </span>
                          <input
                            value={source}
                            onFocus={() => focusLibrarySource(index)}
                            onChange={(event) =>
                              updateLibrarySource(index, event.target.value)
                            }
                            placeholder="[source]"
                            className="h-11 border border-transparent bg-black px-0 py-2 text-sm font-black text-[#39ff14] caret-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:border-[#39ff14] focus:bg-[#001100] focus:px-3 focus:shadow-[inset_0_-0.55rem_0_rgba(57,255,20,0.28)]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {canUseAnonControls || canUseIncogControls ? (
                <div className="mt-6 grid gap-2">
                  {canUseAnonControls ? (
                    <label className="flex items-center gap-3 border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                      <input
                        type="checkbox"
                        checked={postAnonymously}
                        onChange={(event) => {
                          setPostAnonymously(event.target.checked);

                          if (event.target.checked) {
                            setPostIncognito(false);
                          }
                        }}
                        className="h-4 w-4 accent-[#39ff14]"
                      />
                      Anon
                      <span className="text-[0.65rem] tracking-[0.12em] text-[#7f9f78]">
                        name will be classified
                      </span>
                    </label>
                  ) : null}
                  {canUseIncogControls ? (
                    <label className="flex items-center gap-3 border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                      <input
                        type="checkbox"
                        checked={postIncognito}
                        onChange={(event) => {
                          setPostIncognito(event.target.checked);

                          if (event.target.checked) {
                            setPostAnonymously(false);
                          }
                        }}
                        className="h-4 w-4 accent-[#39ff14]"
                      />
                      Incog
                      <span className="text-[0.65rem] tracking-[0.12em] text-[#7f9f78]">
                        WONT BE LISTED ON YOUR PROFILE
                      </span>
                    </label>
                  ) : null}
                  {postIncognito && canUseIncogControls ? (
                  <div className="border border-[#1d7f12] px-3 py-2">
                    {isIncognitoShelfSet ? (
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                        reference code :{" "}
                        {normalizeShelfLabel(incognitoShelfLabel) || "---"}
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        <label className="grid gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                            reference code
                          </span>
                          <input
                            value={incognitoShelfLabel}
                            onChange={(event) =>
                              setIncognitoShelfLabel(
                                event.target.value.slice(0, 120),
                              )
                            }
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsIncognitoShelfSet(true)}
                          className="w-fit border border-[#39ff14] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                        >
                          set
                        </button>
                      </div>
                    )}
                  </div>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  className="min-w-0 border-2 border-[#39ff14] px-3 py-3 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] sm:px-5 sm:text-sm sm:tracking-[0.18em]"
                >
                  Submit to the ether
                </button>
                <button
                  type="button"
                  onClick={resetPostDraft}
                  className="shrink-0 border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                >
                  wipe
                </button>
              </div>
              </form>
            )
          ) : activePanel === "stats" && savedMember ? (
            <StatsPanel
              member={{
                member: savedMember.member,
                name: savedMember.name,
              }}
            />
          ) : activePanel === "my-posts" ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                my posts
              </p>
              {myPosts.length ? (
                <button
                  type="button"
                  onClick={() => setIsWipeAllOpen(true)}
                  className="mt-4 border border-[#ff3b3b] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                >
                  wipe all
                </button>
              ) : null}
              {isWipeAllOpen ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Confirm wipe all posts"
                  className="mt-5 border-2 border-[#39ff14] bg-[#001100] p-4 shadow-[0_0_18px_rgba(57,255,20,0.22)]"
                >
                  <p className="dos-type-command w-fit overflow-hidden whitespace-nowrap text-xs font-black uppercase tracking-[0.18em] text-[#39ff14]">
                    Confirm command?
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setIsWipeAllOpen(false)}
                      className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      cancel
                    </button>
                    <button
                      type="button"
                      onClick={wipeAllPosts}
                      className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                    >
                      confirm
                    </button>
                  </div>
                </div>
              ) : null}
              {myPosts.length ? (
                <div className="mt-5 grid gap-3">
                  {myPosts.map((post) => (
                    <div
                      key={post.id}
                      className="relative border border-[#1d7f12] px-3 py-3"
                    >
                      {canUseAnonControls ? (
                        <button
                          type="button"
                          onClick={() => togglePostAnonymous(post)}
                          className="absolute right-10 top-2 grid h-7 w-9 place-items-center border border-[#1d7f12] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                          aria-label={
                            post.anonymous
                              ? `Show author for ${post.title}`
                              : `Classify author for ${post.title}`
                          }
                          title={post.anonymous ? "classified" : "public"}
                        >
                          {post.anonymous ? (
                            <span className="relative h-4 w-6" aria-hidden="true">
                              <span className="absolute left-0 right-0 top-1/2 h-px bg-current" />
                              <span className="absolute left-1 top-1/2 h-2 w-px origin-top rotate-[-28deg] bg-current" />
                              <span className="absolute left-1/2 top-1/2 h-2 w-px -translate-x-1/2 bg-current" />
                              <span className="absolute right-1 top-1/2 h-2 w-px origin-top rotate-[28deg] bg-current" />
                            </span>
                          ) : (
                            <span className="relative h-5 w-7" aria-hidden="true">
                              <span className="absolute left-1 top-0 h-1.5 w-px rotate-[-20deg] bg-current" />
                              <span className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-current" />
                              <span className="absolute right-1 top-0 h-1.5 w-px rotate-[20deg] bg-current" />
                              <span className="absolute inset-x-0 bottom-0 h-4 rounded-[50%] border border-current" />
                              <span className="absolute left-1/2 top-[0.65rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current" />
                            </span>
                          )}
                        </button>
                      ) : null}
                      {post.anonymous && canUseAnonControls ? (
                        <span className="absolute right-10 top-10 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#39ff14]">
                          classified
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setDeletePostId(post.id)}
                        className="absolute right-2 top-2 border border-[#ff3b3b] px-2 py-0.5 text-xs font-black uppercase tracking-[0.08em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                        aria-label={`Delete ${post.title}`}
                      >
                        x
                      </button>
                      <span className="absolute right-3 top-9 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#39ff14]">
                        {favoritePostCounts[post.id] ?? 0}
                      </span>
                      <a
                        href={getPostHref(post)}
                        className="block pr-10 transition hover:text-[#d7ffd0] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                      >
                        <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                          {post.category.replace("-", " ")}
                        </span>
                        <span className="mt-2 block text-sm font-black uppercase tracking-[0.14em]">
                          {post.title}
                        </span>
                        {post.incognito && post.shelfCode ? (
                          <span className="mt-2 block text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                            reference code : {post.shelfCode}
                          </span>
                        ) : null}
                      </a>
                      {deletePostId === post.id ? (
                        <div className="mt-3 border-t border-[#1d7f12] pt-3">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                            confirm wipe?
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteBayPost(post.id);
                                setDeletePostId("");
                              }}
                              className="border border-[#ff3b3b] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                            >
                              wipe
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePostId("")}
                              className="border border-[#1d7f12] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                            >
                              keep
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 border-l-2 border-[#39ff14] pl-4 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
                  no posts filed yet
                </p>
              )}
            </div>
          ) : activePanel === "favorites" ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                favorites
              </p>
              {!activeFavoriteCategory ? (
                <div className="mt-5 grid gap-3">
                  {[
                    { id: "daily-food", label: "Current Events" },
                    { id: "theory", label: "Conspiracy" },
                    { id: "library-submission", label: "Library" },
                  ].map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setActiveFavoriteCategory(
                          category.id as FavoriteCategory,
                        )
                      }
                      className="border border-[#1d7f12] px-3 py-3 text-left text-sm font-black uppercase tracking-[0.14em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setActiveFavoriteCategory("")}
                    className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                  >
                    back
                  </button>
                  {getFavoritePosts(activeFavoriteCategory).length ? (
                    <div className="mt-5 grid gap-3">
                      {getFavoritePosts(activeFavoriteCategory).map((post) => (
                        <a
                          key={post.id}
                          href={getPostHref(post)}
                          className="block border border-dashed border-[#1d7f12]/70 bg-black px-3 py-3 text-[#d7ffd0] transition hover:border-[#39ff14] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                        >
                          <span className="block text-xs uppercase tracking-[0.14em] text-[#7f9f78]">
                            {new Date(post.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                          <span className="mt-2 block text-sm font-bold">
                            {post.title}
                          </span>
                          <span className="mt-2 block whitespace-pre-wrap text-sm leading-6">
                            {post.body}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 border-l-2 border-[#39ff14] pl-4 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
                      no favorites filed yet
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : activePanel === "lazy-assistant" ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.24em] text-[#d7ffd0]">Black Light</h2>
                  <p className="mt-1 text-xs font-bold text-[#9abc96]">Thiago</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={minimizeLazyAssistant}
                    className="grid h-7 w-7 place-items-center border border-[#1d7f12] text-sm font-black text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    aria-label="Minimize Black Light"
                    title="Minimize"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={wipeLazyAssistant}
                    className="grid h-7 w-7 place-items-center border border-[#ff3b3b] text-sm font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                    aria-label="Wipe Black Light"
                    title="Wipe"
                  >
                    x
                  </button>
                </div>
              </div>
              <div className={styles.thiagoModeBar} role="group" aria-label="Thiago modes">
                {thiagoModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    aria-label={mode.name}
                    title={mode.name}
                    aria-pressed={mode.id === (lazyMode === "preview" ? "bank" : lazyMode)}
                    disabled={isThiagoPublishing || ((mode.id === "bank" || mode.id === "format") && !canUseThiago)}
                    onClick={() => {
                      if (mode.id === "bank" && lazyMode === "preview") return;
                      setLazyMode(mode.id);
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              {lazyResponse ? <p className="mt-3 text-sm text-[#d7ffd0]" role="status">{lazyResponse}</p> : null}
              {lazyMode === "preview" && lazyStructuredPreview ? (
                <div className="mt-5 rounded-2xl border border-[#72c16a]/35 bg-[#07130a] p-5 text-[#dce9d9]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9abc96]">Thiago review · {lazyStructuredPreview.kind}</p>
                  {lazyStructuredPreview.kind === "poll" ? (
                    <div className="mt-4">
                      <h2 className="text-xl font-bold">{lazyStructuredPreview.question}</h2>
                      <ol className="mt-3 list-inside list-decimal space-y-2">{lazyStructuredPreview.options.map(option => <li key={option}>{option}</li>)}</ol>
                      <p className="mt-3 text-xs text-[#9abc96]">Voting opens two minutes after publication and closes seven days later.</p>
                    </div>
                  ) : lazyStructuredPreview.kind === "quiz" ? (
                    <div className="mt-4">
                      <h2 className="text-xl font-bold">{lazyStructuredPreview.draft.title}</h2>
                      <p className="mt-2 text-sm">Week of {lazyStructuredPreview.draft.weekStart} · 36 questions</p>
                      <details className="mt-4 rounded-xl border border-[#72c16a]/25 p-4">
                        <summary className="cursor-pointer">Review all 36 questions and answers</summary>
                        <ol className="mt-4 list-inside list-decimal space-y-4 text-sm">{lazyStructuredPreview.draft.questions.map((item, index) => <li key={index}>
                          <strong>{item.question}</strong> — {item.options[item.correctIndex]}
                          <span className="block text-[#9abc96]">Source: {item.postId} · {item.explanation}</span>
                        </li>)}</ol>
                      </details>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <h2 className="text-xl font-bold">{lazyStructuredPreview.question.question}</h2>
                      <ol className="mt-3 list-inside list-decimal space-y-2">{lazyStructuredPreview.question.options.map((option, index) => <li key={index}>{option}{index === lazyStructuredPreview.question.correctIndex ? " ✓" : ""}</li>)}</ol>
                      <p className="mt-3 text-sm">{lazyStructuredPreview.question.explanation}</p>
                      <p className="mt-2 text-xs text-[#9abc96]">Source article: {lazyStructuredPreview.question.postId}</p>
                    </div>
                  )}
                  {lazyBankError ? <p role="alert" className="mt-4 text-[#ff9b9b]">{lazyBankError}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" disabled={isThiagoPublishing} onClick={confirmStructuredIntake} className="rounded-xl border border-[#72c16a] px-5 py-3 font-bold text-[#dce9d9] disabled:opacity-50">{isThiagoPublishing ? "Saving…" : lazyStructuredPreview.kind === "quiz" ? "Add to Quiz author form" : `Publish ${lazyStructuredPreview.kind}`}</button>
                    <button type="button" onClick={editLazyBankPost} className="rounded-xl border border-[#72c16a]/40 px-5 py-3">Edit pasted text</button>
                  </div>
                </div>
              ) : lazyMode === "preview" && lazyPostPreview ? (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                    preview
                  </p>
                  <article className="mt-5 border-2 border-[#1d7f12] px-4 py-4">
                    {lazyPostPreview.category === "daily-food" &&
                    typeof lazyPostPreview.meta?.dailyFoodOrder ===
                      "string" ? (
                      <p className="float-right text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                        #{lazyPostPreview.meta.dailyFoodOrder}
                      </p>
                    ) : null}
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                      {getDailyFoodCategoryLabel(lazyPostPreview)}
                    </p>
                    {(lazyPostPreview.anonymous || savedMember?.name) ? (
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                        {lazyPostPreview.anonymous
                          ? "classified"
                          : savedMember?.name}
                      </p>
                    ) : null}
                    {typeof lazyPostPreview.meta?.dailyFoodCode === "string" ? (
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                        {lazyPostPreview.meta.dailyFoodCode}
                      </p>
                    ) : null}
                    {lazyPostPreview.category === "daily-food" &&
                    typeof lazyPostPreview.meta?.dailyFoodCategory === "string" ? (
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                        Current Events - {lazyPostPreview.meta.dailyFoodCategory}
                      </p>
                    ) : null}
                    {lazyPostPreview.category === "theory" &&
                    typeof lazyPostPreview.meta?.theoryCategory === "string" &&
                    lazyPostPreview.meta.theoryCategory ? (
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                        Conspiracy - {lazyPostPreview.meta.theoryCategory}
                      </p>
                    ) : null}
                    <h2 className="mt-3 text-xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
                      {lazyPostPreview.title}
                    </h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#d7ffd0]">
                      {lazyPostPreview.body || "no body entered"}
                    </p>
                    {lazyPostPreview.category === "daily-food" && Array.isArray(lazyPostPreview.meta?.tags) ? (
                      <div className="mt-4 space-y-2 text-xs text-[#9abc96]">
                        {lazyPostPreview.meta.tags.map((tag, index) => <p key={index}>
                          Tag {index + 1}: {tag}<br />Source: {Array.isArray(lazyPostPreview.meta?.tagSources) ? lazyPostPreview.meta.tagSources[index] : ""}
                        </p>)}
                      </div>
                    ) : null}
                    {getPostSources(lazyPostPreview).length ? (
                      <div className="mt-5 border-t border-[#1d7f12] pt-3">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                          SOURCES
                        </p>
                        <div className="mt-2 grid gap-2 text-xs">
                          {getPostSources(lazyPostPreview).map((source) => (
                            <a
                              key={source}
                              href={getSourceHref(source)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-[#d7ffd0] underline decoration-[#39ff14] underline-offset-4"
                            >
                              {source}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {getPostTopicTags(lazyPostPreview).length ? (
                      <div className="mt-5 border-t border-[#1d7f12] pt-3">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                          TAGS
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getPostTopicTags(lazyPostPreview).map((tag) => (
                            <span
                              key={tag}
                              className="border border-[#1d7f12] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#39ff14]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                  {lazyBankError ? <p role="alert" className="mt-4 text-[#ff9b9b]">{lazyBankError}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={confirmLazyBankPost}
                      className="border-2 border-[#39ff14] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.55)] transition hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_18px_rgba(57,255,20,0.72)] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      confirm
                    </button>
                    <button
                      type="button"
                      onClick={editLazyBankPost}
                      className="border border-[#1d7f12] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      edit
                    </button>
                  </div>
                </div>
              ) : lazyMode === "bank" ? (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setLazyMode("chat");
                        setLazyBankError("");
                      }}
                      className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      back
                    </button>
                    <p className="order-first w-full text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78] sm:order-none sm:w-auto sm:flex-1 sm:text-center">
                      Thiago intake:{" "}
                      <span className="text-[#39ff14]">
                        {canUseThiago
                          ? `${baySpaceLazyEngineLabel} / auto route`
                          : "unavailable"}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={submitLazyBank}
                      disabled={isThiagoPublishing}
                      onAnimationEnd={() => setLazyShakeTarget("")}
                      className={`ml-auto border border-dashed border-[#39ff14] px-4 py-2 text-sm font-black text-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.28)] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                        lazyShakeTarget === "bank-submit"
                          ? "animate-[option-shake_180ms_linear]"
                          : ""
                      }`}
                      aria-label="Paste & Go"
                    >
                      🌀 Paste &amp; Go 🎢
                    </button>
                  </div>
                  <textarea
                    aria-label="Paste & Go draft"
                    value={lazyBankInput}
                    onChange={(event) => {
                      setLazyBankInput(event.target.value);
                      setLazyBankError("");
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        submitLazyBank();
                      }
                    }}
                    rows={12}
                    className="mt-4 min-h-[20rem] w-full resize-y border-2 border-[#39ff14] bg-black px-4 py-4 font-mono text-base font-bold leading-7 text-[#39ff14] outline-none shadow-[0_0_18px_rgba(57,255,20,0.18)] placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#d7ffd0]"
                  />
                  {lazyBankError ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#ff6b6b]">
                      {lazyBankError}
                    </p>
                  ) : null}
                  <p className="mt-4 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-xs font-black uppercase leading-5 tracking-[0.16em] text-[#d7ffd0]">
                    Paste a Conspiracy, Current Events, Poll, or complete Weekly Quiz draft.
                    Press 🌀 Paste &amp; Go 🎢 or Command/Control + Enter to review before publishing.
                  </p>
                </div>
              ) : lazyMode === "format" ? (
                <ThiagoFormatter
                  routes={availableBankCategories}
                  input={lazyBankInput}
                  onInput={setLazyBankInput}
                  onUse={(formatted) => {
                    setLazyBankInput(formatted);
                    openLazyBank();
                  }}
                />
              ) : lazyMode === "chat" || lazyMode === "investigate" ? (
                <ThiagoArticleTools
                  mode={lazyMode}
                  memberNumber={savedMember?.member ?? resolvedMember}
                  memberStats={savedMember ? {
                    availablePoints: savedMember.availablePoints,
                    lifetimePoints: savedMember.lifetimePoints,
                    bayoCoins: savedMember.bayoCoins,
                    bayoTokens: savedMember.bayoTokens,
                    rank: isOracleMember ? "Oracle" : getBayRankLabel(savedMember.rank),
                    cryptiRank: getCryptiRankLabel(savedMember.cryptiRank),
                    promotion: promotionProgress,
                  } : null}
                  posts={allPosts.filter((post) => post.meta?.cryptiPost !== "true")}
                  getSources={(post) => [
                    ...getPostSources(post),
                    ...(Array.isArray(post.meta?.tagSources) ? post.meta.tagSources : []),
                  ].filter(Boolean)}
                />
              ) : null}
            </div>
          ) : activePanel === "quiz" && savedMember ? (
            <QuizPanel />
          ) : activePanel === "inbox" && savedMember ? (
            <InboxPanel
              initialMember={targetInboxMember}
              member={{
                member: savedMember.member,
                name: savedMember.name,
              }}
            />
          ) : activePanel === "circles" && savedMember ? (
            <CirclesPanel
              member={{
                member: savedMember.member,
                name: savedMember.name,
              }}
            />
          ) : activePanel === "exchange" && savedMember ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                exchange
              </p>
              <div className={styles.exchangeSections}>
                <ExchangeConversion
                  kind="coins"
                  rate={bayoCoinExchangeRate}
                  value={exchangePoints}
                  onChange={(value) => { setExchangePoints(value); setExchangeMessage(""); }}
                  onTrade={exchangePointsForCoins}
                  loading={isExchangeLoading}
                  balance={savedMember.bayoCoins ?? 0}
                  available={savedMember.availablePoints ?? 0}
                />

                <details className={styles.exchangeSection}>
                  <summary>Stamps</summary>
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-3 border border-[#1d7f12] bg-[#001100] p-4 text-xs font-black uppercase leading-5 tracking-[0.14em] text-[#d7ffd0] sm:grid-cols-2">
                      <p>
                        Bayo Coins
                        <span className="mt-2 block text-xl text-[#39ff14]">
                          {formatPointCount(savedMember.bayoCoins)}
                        </span>
                      </p>
                      <p>
                        Tokens
                        <span className="mt-2 block text-xl text-[#e7c654]">
                          {formatPointCount(savedMember.bayoTokens)}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs font-bold text-[#a9c3a4]">
                      Collected stamps appear in your profile Trophy Case.
                    </p>
                    {stampMessage ? (
                      <p className={styles.exchangeFeedback} role="status">{stampMessage}</p>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {bayoStamps.filter((stamp) => stamp.id !== "birthday" ||
                        isBirthdayOn(savedMember.birthdayMonth, savedMember.birthdayDay, pacificDate),
                      ).map((stamp) => {
                        const isOwned = savedMember.bayoStamps?.includes(stamp.id);
                        const tokenCost = stamp.tokenCost ?? 0;
                        const points = stamp.pointReward ?? defaultStampPointReward;
                        const canBuy =
                          !isOwned &&
                          (savedMember.bayoCoins ?? 0) >= stamp.coinCost &&
                          (savedMember.bayoTokens ?? 0) >= tokenCost;
                        const costLabel =
                          tokenCost > 0
                            ? `${tokenCost} ${tokenCost === 1 ? "token" : "tokens"}`
                            : stamp.coinCost === 0
                            ? "free"
                            : `${stamp.coinCost} ${
                                stamp.coinCost === 1 ? "coin" : "coins"
                              }`;

                        return (
                          <div
                            key={stamp.id}
                            className={`relative grid gap-3 border p-4 pb-10 ${
                              isOwned
                                ? "border-[#39ff14] bg-[#001100]"
                                : "border-[#1d7f12]"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#39ff14]">
                                {stamp.label}
                              </p>
                              <p className="mt-2 text-xs font-bold uppercase leading-5 tracking-[0.12em] text-[#7f9f78]">
                                {stamp.description}
                              </p>
                              {!isOwned && points > 0 ? (
                                <p className="mt-1 text-xs font-bold text-[#a7e19e]">
                                  +{formatPointCount(points)} points
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => purchaseStamp(stamp.id)}
                              disabled={
                                isExchangeLoading || Boolean(isOwned) || !canBuy
                              }
                              className="w-fit border border-[#1d7f12] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black disabled:text-[#7f9f78] disabled:hover:border-[#1d7f12] disabled:hover:bg-transparent"
                            >
                              {isOwned ? "owned" : costLabel}
                            </button>
                            <span className="absolute bottom-2 right-3 text-xs font-black uppercase tracking-[0.14em] text-[#7f9f78]">
                              {formatPointCount(stampCounts[stamp.id] ?? 0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>

                <details className={styles.exchangeSection}>
                  <summary>Cards</summary>
                  <div className="mt-4 grid gap-4">
                    {(() => {
                      const ownedCards = savedMember.bayoCards ?? [];
                      const activeCards = savedMember.activeBayoCards ?? [];
                      const activeSlotCount =
                        getBayoCardActiveSlotCount(activeCards);
                      const isGraduated = savedMember.rank === "graduation";

                      return (
                        <>
                          <div className="grid gap-3 border border-[#1d7f12] bg-[#001100] p-4 text-xs font-black uppercase leading-5 tracking-[0.14em] text-[#d7ffd0] sm:grid-cols-3">
                            <p>
                              Bayo Coins
                              <span className="mt-2 block text-xl text-[#39ff14]">
                                {formatPointCount(savedMember.bayoCoins)}
                              </span>
                            </p>
                            <p>
                              active slots
                              <span className="mt-2 block text-xl text-[#39ff14]">
                                {activeCards.length}/{activeSlotCount}
                              </span>
                            </p>
                            <p>
                              rule
                              <span className="mt-2 block text-[#7f9f78]">
                                one active card. Doublay allows three.
                              </span>
                            </p>
                          </div>

                          <div className="grid gap-3">
                            {bayoCards.map((card) => {
                              const isOwned = ownedCards.includes(card.id);
                              const isActive = activeCards.includes(card.id);
                              const canBuy =
                                isGraduated &&
                                !isOwned &&
                                (savedMember.bayoCoins ?? 0) >= card.coinCost;
                              const wouldUseOpenSlot =
                                activeCards.includes("doublay-card") &&
                                !isActive &&
                                card.id !== "doublay-card";
                              const hasOpenSlot =
                                activeCards.length < activeSlotCount;
                              const canToggle =
                                isOwned &&
                                (isActive || !wouldUseOpenSlot || hasOpenSlot);
                              const buttonLabel = !isOwned
                                ? isGraduated
                                  ? `${formatPointCount(card.coinCost)} coins`
                                  : "locked"
                                : isActive
                                  ? "turn off"
                                  : canToggle
                                    ? "activate"
                                    : "slots full";

                              return (
                                <div
                                  key={card.id}
                                  className={`grid gap-3 border p-4 sm:grid-cols-[1fr_auto] sm:items-center ${
                                    isActive
                                      ? "border-[#39ff14] bg-[#001100] text-[#d7ffd0]"
                                      : "border-[#1d7f12] text-[#d7ffd0]"
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#39ff14]">
                                      {card.label}
                                      {isActive ? " / active" : ""}
                                    </p>
                                    <p className="mt-2 text-xs font-bold uppercase leading-5 tracking-[0.12em] text-[#7f9f78]">
                                      {card.description}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      isOwned
                                        ? toggleCard(card.id)
                                        : purchaseCard(card.id)
                                    }
                                    disabled={
                                      isExchangeLoading ||
                                      (isOwned ? !canToggle : !canBuy)
                                    }
                                    className="w-fit border border-[#1d7f12] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black disabled:text-[#7f9f78] disabled:hover:border-[#1d7f12] disabled:hover:bg-transparent"
                                  >
                                    {buttonLabel}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </details>

                <details className={styles.exchangeSection}>
                  <summary>Badge Quest</summary>
                  <div className="mt-4 grid gap-3">
                    {(() => {
                      const isGraduated = savedMember.rank === "graduation";

                      return (
                        <div className="grid gap-3 border border-[#39ff14] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#39ff14]">
                              Graduation
                            </p>
                            <p className="mt-2 text-xs font-bold uppercase leading-5 tracking-[0.12em] text-[#7f9f78]">
                              must buy or earn this badge before any other
                              badges or cards in Badge Quest.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={purchaseGraduation}
                            disabled={
                              isExchangeLoading ||
                              isGraduated ||
                              (savedMember.bayoTokens ?? 0) < graduationTokenCost
                            }
                            className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent"
                          >
                            {isGraduated
                              ? "owned"
                              : `${graduationTokenCost} tokens`}
                          </button>
                        </div>
                      );
                    })()}
                    {badgeQuestGateKeys.map((gateKey) => {
                      const isGraduated = savedMember.rank === "graduation";
                      const isOwned = savedMember.gateKeys?.includes(gateKey.id);
                      const isCryptiGate = gateKey.id === "crypti-plus";
                      const isInstantRankPromotionII =
                        gateKey.id === "instant-rank-promotion-ii";
                      const isOracleBadge = gateKey.id === "oracle-badge";
                      const hasCryptiPlus = Boolean(
                        savedMember.gateKeys?.includes("crypti-plus"),
                      );
                      const hasInstantRankPromotion = Boolean(
                        savedMember.gateKeys?.includes(
                          "instant-rank-promotion",
                        ),
                      );
                      const hasRequiredPromotion =
                        !isInstantRankPromotionII || hasInstantRankPromotion;
                      const hasPosterV =
                        savedMember.cryptiRank === "poster-v" ||
                        savedMember.cryptiRank === "oracle";
                      const gateRequirementsMet =
                        gateKey.id === "crypti-plus"
                          ? isGraduated
                          : gateKey.id === "instant-rank-promotion"
                            ? hasCryptiPlus
                            : isInstantRankPromotionII
                              ? hasRequiredPromotion
                              : isOracleBadge
                                ? isGraduated && hasCryptiPlus && hasPosterV
                              : isGraduated;
                      const canBuy =
                        isGraduated &&
                        !isOwned &&
                        gateRequirementsMet &&
                        (savedMember.bayoTokens ?? 0) >= gateKey.tokenCost;

                      return (
                        <div
                          key={gateKey.id}
                          className={`grid gap-3 border p-4 sm:grid-cols-[1fr_auto] sm:items-center ${
                            isOracleBadge
                              ? "border-[#b6d88f] text-[#e4f0d5]"
                              : isCryptiGate
                              ? "border-[#72d7ff] text-[#d7f5ff]"
                              : "border-[#1d7f12] text-[#d7ffd0]"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.18em]">
                              {isOracleBadge && !hasPosterV && !isOwned
                                ? "Classified Final Badge"
                                : gateKey.label}
                            </p>
                            <p className="mt-2 text-xs font-bold uppercase leading-5 tracking-[0.12em] text-[#7f9f78]">
                              {isOracleBadge && !hasPosterV && !isOwned
                                ? "Reach Poster V to reveal the final Bay Space rank."
                                : gateKey.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => purchaseGateKey(gateKey.id)}
                            disabled={isExchangeLoading || !canBuy}
                            className="w-fit border border-[#1d7f12] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black disabled:text-[#7f9f78] disabled:hover:border-[#1d7f12] disabled:hover:bg-transparent"
                          >
                            {isOwned
                              ? "owned"
                              : isGraduated && gateRequirementsMet
                                ? `${gateKey.tokenCost} tokens`
                                : "locked"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </details>

                <ExchangeConversion
                  kind="tokens"
                  rate={bayoTokenExchangeRate}
                  value={exchangeCoins}
                  onChange={(value) => { setExchangeCoins(value); setExchangeMessage(""); }}
                  onTrade={exchangeCoinsForTokens}
                  loading={isExchangeLoading}
                  balance={savedMember.bayoTokens ?? 0}
                  available={savedMember.bayoCoins ?? 0}
                />

                {exchangeMessage ? (
                  <p className={styles.exchangeFeedback} role="status">{exchangeMessage}</p>
                ) : null}
              </div>
            </div>
          ) : activePanel === "settings" ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                settings
              </p>
              <div className="mt-5 grid gap-5">
                <button
                  type="button"
                  className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]"
                >
                  Privacy options button (coming soon)
                </button>

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Email (optional)
                  </span>
                  <input
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value.slice(0, 120));
                      setSettingsMessage("");
                    }}
                    className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                  />
                </label>

                <div className="grid gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Birthday
                  </p>
                  <p className="text-xs text-[#a9c3a4]">
                    Save your month and day to claim a Birthday stamp on your birthday. Year is optional.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <input
                      inputMode="numeric"
                      aria-label="Birthday month"
                      placeholder="month"
                      value={birthdayMonth}
                      onChange={(event) => {
                        setBirthdayMonth(
                          event.target.value.replace(/\D/g, "").slice(0, 2),
                        );
                        setSettingsMessage("");
                      }}
                      className="w-28 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                    <input
                      inputMode="numeric"
                      aria-label="Birthday day"
                      placeholder="day"
                      value={birthdayDay}
                      onChange={(event) => {
                        setBirthdayDay(event.target.value.replace(/\D/g, "").slice(0, 2));
                        setSettingsMessage("");
                      }}
                      className="w-28 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                    <input
                      inputMode="numeric"
                      aria-label="Birthday year (optional)"
                      placeholder="year"
                      value={birthdayYear}
                      onChange={(event) => {
                        setBirthdayYear(
                          event.target.value.replace(/\D/g, "").slice(0, 4),
                        );
                        setSettingsMessage("");
                      }}
                      className="w-28 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Personal Links
                  </p>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#7f9f78]">
                    option to display on public profile page
                  </p>
                  {[
                    { id: "x", label: "X" },
                    { id: "linkedin", label: "linkd in" },
                    { id: "github", label: "github" },
                    { id: "youtube", label: "youtube" },
                  ].map((link) => {
                    const linkId = link.id as keyof Required<SettingsLinks>;

                    return (
                      <div
                        key={link.id}
                        className="grid gap-2 border border-[#1d7f12] px-3 py-3 sm:grid-cols-[120px_1fr]"
                      >
                        <label className="grid gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                            {link.label}
                          </span>
                          <input
                            value={settingsLinks[linkId].url}
                            onChange={(event) =>
                              updateSettingsLink(
                                linkId,
                                "url",
                                event.target.value,
                              )
                            }
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                          />
                        </label>
                        <label className="flex items-end gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                          <input
                            type="checkbox"
                            checked={settingsLinks[linkId].display}
                            onChange={(event) =>
                              updateSettingsLink(
                                linkId,
                                "display",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 accent-[#39ff14]"
                          />
                          display on public profile
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-[#1d7f12] pt-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Delete Account buttons
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteAccountConfirm(true);
                        setWipeAccountConfirm(false);
                        setSettingsMessage("");
                      }}
                      className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                    >
                      delete account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWipeAccountConfirm(true);
                        setDeleteAccountConfirm(false);
                        setSettingsMessage("");
                      }}
                      className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                    >
                      wipe account
                    </button>
                  </div>

                  {deleteAccountConfirm ? (
                    <div className="mt-4 border border-[#ff3b3b] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                        you wont be able ot undo this, your account number will
                        be retired. Continue?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={deleteAccount}
                          className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                        >
                          Full Erase
                        </button>
                        <button
                          type="button"
                          onClick={wipeAccount}
                          className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                        >
                          Wipe instead
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {wipeAccountConfirm ? (
                    <div className="mt-4 border border-[#1d7f12] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                        all post across all categorys will be erased. Continue?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={wipeAccount}
                          className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                        >
                          Wipe
                        </button>
                        <button
                          type="button"
                          onClick={() => setWipeAccountConfirm(false)}
                          className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 border border-[#1d7f12] bg-[#001100] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                      Privacy + agreement
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase leading-5 tracking-[0.14em] text-[#d7ffd0]">
                      BaySpace stores account, session, post, saved-post,
                      profile, and moderation data needed to run the room.
                      Public posts can be seen publicly. Anonymous and
                      incognito settings change public display only; they do
                      not hide records from BaySpace systems.
                    </p>
                    <a
                      href={settingsAgreementHref}
                      target="_blank"
                      rel="external noopener noreferrer"
                      onClick={(event) => {
                        if (openExternalBrowser(settingsAgreementHref)) {
                          event.preventDefault();
                        }
                      }}
                      className="mt-3 inline-flex border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      privacy + user agreement
                    </a>
                    {isCryptiMember ? (
                      <div
                        className={`mt-4 border p-4 ${
                          isCryptiAgreementAlert
                            ? "border-[#72d7ff] shadow-[0_0_18px_rgba(114,215,255,0.35)]"
                            : "border-[#1d7f12]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={openCryptiAgreement}
                          className="inline-flex border border-[#72d7ff] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#72d7ff] transition hover:bg-[#72d7ff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                        >
                          open +CRYPTI user agreement
                        </button>
                        <label className="mt-4 flex items-start gap-3 text-xs font-black uppercase leading-5 tracking-[0.16em] text-[#72d7ff]">
                          <input
                            type="checkbox"
                            checked={
                              hasAcceptedCurrentCryptiAgreement ||
                              hasAcceptedCryptiAgreement
                            }
                            disabled={
                              hasAcceptedCurrentCryptiAgreement ||
                              hasAcceptedCryptiAgreement
                            }
                            onChange={(event) => {
                              if (
                                hasAcceptedCurrentCryptiAgreement ||
                                hasAcceptedCryptiAgreement
                              ) {
                                return;
                              }

                              if (event.target.checked) {
                                void saveCryptiAgreementConfirmation();
                                return;
                              }

                              setHasAcceptedCryptiAgreement(false);
                              setIsCryptiAgreementAlert(false);
                              setSettingsMessage("");
                            }}
                            className="mt-0.5 h-4 w-4 accent-[#72d7ff] disabled:opacity-60"
                          />
                          <span>
                            {hasAcceptedCurrentCryptiAgreement
                              ? "+CRYPTI user agreement saved"
                              : "I have read and agree the +CRYPTI user agreement."}
                          </span>
                        </label>
                        {needsCryptiAgreementAcceptance ? (
                          <p className="mt-3 text-[0.68rem] font-black uppercase leading-5 tracking-[0.14em] text-[#d7ffd0]">
                            Required after +CRYPTI purchase before settings can
                            be saved.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="mt-4 flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="h-4 w-4 accent-[#39ff14]"
                      />
                      user agreement completed at sign up
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  save settings
                </button>

                {settingsMessage ? (
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#39ff14]">
                    {settingsMessage}
                  </p>
                ) : null}

                {isAdminMember ? (
                  <Link
                    href="/admin/analytics"
                    className="w-fit border border-[#72d7ff] px-3 py-2 text-left transition hover:border-[#72d7ff] hover:bg-[#72d7ff] hover:text-black hover:shadow-[0_0_12px_rgba(114,215,255,0.35)]"
                  >
                    analytics
                  </Link>
                ) : null}
                <div className="border-t border-[#1d7f12] pt-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    support
                  </p>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-3 inline-flex max-w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    {supportEmail}
                  </a>
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                    PASSWORD: CLASSIFIED
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword((isChanging) => !isChanging);
                      setPasswordChangeMessage("");
                    }}
                    className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] underline decoration-[#39ff14] underline-offset-4"
                  >
                    change password
                  </button>
                  {isChangingPassword ? (
                    <div className="mt-4 grid max-w-md gap-3">
                      <label className="grid gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                          new password
                        </span>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(event) => {
                            setNewPassword(event.target.value.slice(0, 24));
                            setPasswordChangeMessage("");
                          }}
                          className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                          confirm password
                        </span>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => {
                            setConfirmPassword(event.target.value.slice(0, 24));
                            setPasswordChangeMessage("");
                          }}
                          className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={changePassword}
                          className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                        >
                          save password
                        </button>
                        <button
                          type="button"
                          onClick={cancelPasswordChange}
                          className="border border-[#1d7f12] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {passwordChangeMessage ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14]">
                      {passwordChangeMessage}
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-[#1d7f12] pt-5">
                  <button
                    type="button"
                    aria-label="Open Wild Card access"
                    title="Wild Card"
                    onClick={() => {
                      setIsWildCardOpen((isOpen) => !isOpen);
                      setWildCardMessage("");
                    }}
                    className="grid h-14 w-14 place-items-center border border-[#d7ffd0] bg-black text-3xl text-[#d7ffd0] shadow-[0_0_14px_rgba(215,255,208,0.2)] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_18px_rgba(57,255,20,0.5)] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    🃏
                  </button>

                  {isWildCardOpen ? (
                    <div className="mt-4 grid max-w-md gap-3 border border-[#1d7f12] bg-[#001100] p-4">
                      <label className="grid gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                          access key
                        </span>
                        <input
                          type="password"
                          value={wildCardAccessKey}
                          onChange={(event) => {
                            setWildCardAccessKey(
                              event.target.value.slice(0, 48),
                            );
                            setWildCardMessage("");
                          }}
                          className="border border-[#1d7f12] bg-black px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={unlockWildCard}
                        disabled={isWildCardLoading}
                        className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent"
                      >
                        {isWildCardLoading ? "checking" : "unlock"}
                      </button>
                      {wildCardMessage ? (
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                          {wildCardMessage}
                        </p>
                      ) : null}
                      {savedMember?.impossibleBadgeReady &&
                      !hasImpossibleBadge ? (
                        <button
                          type="button"
                          onClick={claimImpossibleBadge}
                          disabled={isWildCardLoading}
                          className="w-fit border border-[#d7ffd0] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0] transition hover:bg-[#d7ffd0] hover:text-black disabled:opacity-50"
                        >
                          claim IMPOSSIBLE
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : activePanel === "id-card" && savedMember ? (
            <div>
              <button
                type="button"
                onClick={() => setActivePanel("circles")}
                className={styles.exchangeCard}
              >
                <span className={styles.exchangeEyebrow}>Bay Space</span>
                <span className={styles.exchangeTitle}>Circles</span>
                <span className={styles.exchangeArrow} aria-hidden="true">→</span>
              </button>
              <nav className={`${styles.exchangeCard} ${styles.feedShortcuts}`} aria-label="Article feeds">
                <Link href="/theories">
                  <span className={styles.exchangeTitle}>Conspiracy<br />Theories</span>
                </Link>
                <Link href="/facts-on-news">
                  <span className={styles.exchangeTitle}>Current<br />Events</span>
                </Link>
              </nav>
              <button
                type="button"
                onClick={openBlackLight}
                className={`${styles.exchangeCard} ${styles.blackLightCard}`}
              >
                <span className={styles.exchangeEyebrow}>Ask Thiago</span>
                <span className={styles.exchangeTitle}>Black Light</span>
                <span className={styles.exchangeArrow} aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("exchange")}
                className={styles.exchangeCard}
              >
                <span className={styles.exchangeEyebrow}>Bay Space</span>
                <span className={styles.exchangeTitle}>Exchange</span>
                <span className={styles.exchangeArrow} aria-hidden="true">
                  →
                </span>
              </button>
              <div className={`${styles.balanceBar} ${styles.exchangeBalances}`} aria-label="Exchange balances">
                <span>
                  <small>Lifetime<br />Points</small>
                  <strong>{formatPointCount(savedMember.lifetimePoints)}</strong>
                </span>
                <span>
                  <small>Points</small>
                  <strong>{formatPointCount(savedMember.availablePoints)}</strong>
                </span>
                <span>
                  <small>Coins</small>
                  <strong>{formatPointCount(savedMember.bayoCoins)}</strong>
                </span>
                <span>
                  <small>Tokens</small>
                  <strong>{formatPointCount(savedMember.bayoTokens)}</strong>
                </span>
              </div>
              <div className={`${styles.balanceBar} ${styles.rankBar}`} aria-label="Rank progress">
                <span>
                  <small>Rank</small>
                  <strong>{isOracleMember ? "Oracle" : getCryptiRankLabel(savedMember.cryptiRank) || getBayRankLabel(savedMember.rank)}</strong>
                </span>
                <span>
                  <small>Points till next rank</small>
                  <strong>{isOracleEligible ? "Oracle Badge required" : formatPointCount(promotionProgress?.pointsUntil ?? 0)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                member {resolvedMember || "---"}
              </p>
              <p className="mt-6 border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0]">
                briefing room area online. options will be expanded soon.
              </p>
            </>
          )}
        </section>
      </div>
      </div>
    );
  }

  if (isCheckingSession) {
    return (
      <div className={styles.gate}>
        {header}
        <div className={`${styles.accessCard} mt-10 w-full max-w-md border-l-2 border-[#39ff14] pl-4 text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]`}>
          syncing access
        </div>
      </div>
    );
  }

  if (resolvedMember) {
    return (
      <div className={styles.gate}>
        {header}
        <form
          onSubmit={unlock}
          className={`${styles.accessCard} mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]`}
          aria-label="Enter briefing room password"
        >
          <label
            htmlFor="briefing-password"
            className="mb-3 block text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]"
          >
            enter password
          </label>
          <input
            id="briefing-password"
            type="password"
            value={gatePassword}
            onChange={(event) => {
              setGatePassword(event.target.value.slice(0, 24));
              setGateErrorMessage("");
            }}
            className="w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
            autoFocus
          />
          {gateErrorMessage ? (
            <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14]">
              {gateErrorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.gate}>
    <div className={`${styles.accessCard} w-full max-w-xl border-2 border-[#1d7f12] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
        briefing room requires an active member session
      </p>
      <p className="mt-4 text-sm font-bold uppercase leading-6 tracking-[0.14em] text-[#7f9f78]">
        enter your member number in the top bar or join the circle to create an
        account.
      </p>
      <Link
        href="/join-the-circle"
        className="mt-5 inline-flex border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        join the circle
      </Link>
    </div>
    </div>
  );
}
