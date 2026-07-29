"use client";

import Image from "next/image";
import Link from "next/link";
import CirclesPanel from "./circles-panel";
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
} from "../../lib/bay-space-roles";
import {
  bayoCards,
  bayoCoinExchangeRate,
  bayoStamps,
  bayoTokenExchangeRate,
  gateKeys,
  getBayoCardActiveSlotCount,
  getBayRankLabel,
  getBayRankLevel,
  getCryptiRankLabel,
  getNextPromotionProgress,
  graduationCoinCost,
  isTokenGateKey,
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
import {
  baySpaceAgreementHref,
  cryptiAgreementAcceptedStorageKey,
  cryptiAgreementHref,
  cryptiAgreementVersion,
} from "../../lib/bay-space-agreement";
import TicketVoteCounter from "../components/ticket-vote-counter";
import { openExternalBrowser } from "../components/open-external-browser";

type BriefingRoomGateProps = {
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
  gateKeys?: GateKey[];
  lifetimePoints?: number;
  member: string;
  name: string;
  purchasedTitles?: BayoTitleId[];
  rank?: BayRank;
  refName: string;
  roles: string;
  title: string;
  email?: string;
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
type LazyAssistantMode = "chat" | "bank" | "preview";
type PostPreviewDraft = Omit<BayPost, "id" | "createdAt" | "dateKey">;

type SourceDraft = {
  id: number;
  link: string;
  connection: string;
};

type FavoriteCategory = "daily-food" | "theory" | "library-submission";
type BriefingPanel =
  | "id-card"
  | "post"
  | "my-posts"
  | "favorites"
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
  dailyFoodCategory: string;
  theoryCategory: string;
  theoryHeadline: string;
  theoryPost: string;
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
  sources: string[];
  tags: string[];
  theoryCategory: string;
  title: string;
};

function isCryptiPost(post: BayPost) {
  return post.meta?.cryptiPost === "true";
}

const postCategories: { id: PostCategory; label: string }[] = [
  { id: "daily-food", label: "Daily food" },
  { id: "theory", label: "Theory" },
  { id: "library-submission", label: "Library submission" },
];

const activeMemberStorageKey = "bay-space-active-member";
const openPostDraftsStorageKey = "bay-space-open-post-drafts";
const lazyPostGptUrl =
  "https://chatgpt.com/g/g-6a0c0390b6b08191991a65f1b3753fe7-lazy-assistant";
const baySpaceLazyEngineLabel = "Thiago";
const defaultTheoryCategory = "MISC";
const supportEmail = "bayoadmin@protonmail.com";
const optionRoomPanels: BriefingPanel[] = [
  "exchange",
  "circles",
  "my-posts",
  "favorites",
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
    return post.category.replace("-", " ");
  }

  return typeof dailyFoodCategory === "string" && dailyFoodCategory
    ? `Daily Food - ${dailyFoodCategory}`
    : "Daily Food";
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

  return duplicatedMarkdownUrl?.[1] ?? normalizedUrl;
}

function extractBankUrls(value: string) {
  const markdownUrls = Array.from(
    value.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g),
    (match) => match[1],
  );
  const urls = value.match(/https?:\/\/[^\s<>"']+/g) ?? [];

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

function extractBankDailyFoodCategory(value: string) {
  const categoryMatch = value.match(/(?:^|\n)\s*category\s*:\s*([^\n]+)/i);
  const categoryLine = categoryMatch?.[1] ?? "";
  const matchedCategory =
    findBankCategoryLabel(categoryLine, dailyFoodCategories) ||
    findBankCategoryLabel(value, dailyFoodCategories);

  return matchedCategory || defaultDailyFoodCategory;
}

function extractBankTheoryCategory(value: string) {
  const categoryMatch = value.match(/(?:^|\n)\s*category\s*:\s*([^\n]+)/i);
  const categoryLine = categoryMatch?.[1] ?? "";

  return (
    findBankCategoryLabel(categoryLine, theoryCategories.map((category) => category.label)) ||
    findBankCategoryLabel(value, theoryCategories.map((category) => category.label))
  );
}

function detectBankPostCategory(value: string, allowedCategories: BankPostCategory[]) {
  const normalizedValue = value.toLowerCase();
  const dailyFoodCategory = extractBankDailyFoodCategory(value);
  const theoryCategory = extractBankTheoryCategory(value);
  const dailyFoodSignals = [
    /\bdaily\s*food\b/.test(normalizedValue),
    dailyFoodCategory !== defaultDailyFoodCategory,
  ].filter(Boolean).length;
  const theorySignals = [
    /\b(?:conspiracy|theor(?:y|ies))\b/.test(normalizedValue),
    Boolean(theoryCategory),
  ].filter(Boolean).length;
  const hasDailyFoodAccess = allowedCategories.includes("daily-food");
  const hasTheoryAccess = allowedCategories.includes("theory");

  if (dailyFoodSignals && !theorySignals) {
    return hasDailyFoodAccess
      ? { category: "daily-food" as const, dailyFoodCategory, theoryCategory }
      : { error: "daily food route unavailable for this account" };
  }

  if (theorySignals && !dailyFoodSignals) {
    return hasTheoryAccess
      ? { category: "theory" as const, dailyFoodCategory, theoryCategory }
      : { error: "theory route unavailable for this account" };
  }

  if (dailyFoodSignals && theorySignals) {
    if (!hasDailyFoodAccess && hasTheoryAccess) {
      return { category: "theory" as const, dailyFoodCategory, theoryCategory };
    }

    if (hasDailyFoodAccess && !hasTheoryAccess) {
      return { category: "daily-food" as const, dailyFoodCategory, theoryCategory };
    }

    return { error: "post route unclear: daily food and theory signals found" };
  }

  if (allowedCategories.length === 1) {
    return {
      category: allowedCategories[0],
      dailyFoodCategory,
      theoryCategory,
    };
  }

  return { error: "post route missing: include Daily Food or a theory category" };
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
      !/^(daily\s*food|theor(?:y|ies)|conspiracy|top\s*story|library)[.!]?$/.test(
        normalizedLine,
      ) &&
      !/^(next|sources?|source links?|details?|body|tags?)\b/.test(
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
  const sectionMatch = value.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:${labelPattern})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:headline|title|details?|body|tags?|sources?|source links?)\\s*:|$)`,
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
        !/^(sources?|source links?)\s*:/.test(trimmedLine)
      );
    })
    .join("\n")
    .trim();
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

  const title = extractBankHeadline(trimmedValue).slice(0, 75);
  const sources = extractBankUrls(trimmedValue);
  const tagBlocks = extractBankTagBlocks(trimmedValue);
  const detailLines = tagBlocks.length ? tagBlocks : extractBankDetailLines(trimmedValue);
  const tags = detailLines.map((tag) => tag.slice(0, 150)).slice(0, 3);
  const bodySection = extractBankSection(trimmedValue, ["body", "theory", "post"]);
  const fallbackBody = tags.length
    ? tags.join("\n")
    : stripBankSourceLines(
        trimmedValue
          .replace(/https?:\/\/[^\s<>"']+/g, "")
          .replace(/(?:headline|title)[\s\S]{0,120}?(?:with|:|-)\s*[\s\S]*?(?=\s+Confirm\b|\n|$)/i, ""),
      );
  const body =
    detectedCategory.category === "daily-food"
      ? tags.join("\n")
      : stripBankSourceLines(bodySection || fallbackBody).slice(0, 50000);

  if (!title) {
    return { error: "headline missing" };
  }

  if (detectedCategory.category === "daily-food" && !tags.length) {
    return { error: "daily food details missing" };
  }

  if (detectedCategory.category === "theory" && !body) {
    return { error: "theory body missing" };
  }

  if (detectedCategory.category === "theory" && !detectedCategory.theoryCategory) {
    return { error: "theory category label missing" };
  }

  return {
    post: {
      body,
      category: detectedCategory.category,
      dailyFoodCategory: detectedCategory.dailyFoodCategory,
      sources,
      tags,
      theoryCategory: detectedCategory.theoryCategory,
      title,
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

export default function BriefingRoomGate({ member }: BriefingRoomGateProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [resolvedMember, setResolvedMember] = useState(member);
  const [gatePassword, setGatePassword] = useState("");
  const [gateErrorMessage, setGateErrorMessage] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [activePanel, setActivePanel] = useState<BriefingPanel>("id-card");
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
  const [lazyMode, setLazyMode] = useState<LazyAssistantMode>("chat");
  const [lazyPrompt, setLazyPrompt] = useState("");
  const [lazyResponse, setLazyResponse] = useState("LA Bay-Space: coming soon");
  const [lazyBankInput, setLazyBankInput] = useState("");
  const [lazyBankError, setLazyBankError] = useState("");
  const [lazyPostPreview, setLazyPostPreview] =
    useState<PostPreviewDraft | null>(null);
  const [isLazyAssistantMinimized, setIsLazyAssistantMinimized] =
    useState(false);
  const [lazyShakeTarget, setLazyShakeTarget] = useState<
    "" | "send" | "bank" | "bank-submit"
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
  const [isExchangeLoading, setIsExchangeLoading] = useState(false);
  const [stampCounts, setStampCounts] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");
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
  const [dailyFoodCategory, setDailyFoodCategory] = useState(
    defaultDailyFoodCategory,
  );
  const [theoryCategory, setTheoryCategory] = useState(defaultTheoryCategory);
  const [theoryHeadline, setTheoryHeadline] = useState("");
  const [theoryPost, setTheoryPost] = useState("");
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
  const activePostCategory = allowedPostCategories.includes(postCategory)
    ? postCategory
    : availablePostCategories[0]?.id ?? "library-submission";
  const isBayoClubMember = isBayoClub(savedMember);
  const isCryptiMember = isCrypti(savedMember);
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
            dailyFoodCategory,
            theoryCategory,
            theoryHeadline,
            theoryPost,
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

  function createBlankDraft(id: number): PostDraft {
    return {
      id,
      postCategory: availablePostCategories[0]?.id ?? "library-submission",
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
      dailyFoodCategory: defaultDailyFoodCategory,
      theoryCategory: defaultTheoryCategory,
      theoryHeadline: "",
      theoryPost: "",
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
      dailyFoodCategory,
      theoryCategory,
      theoryHeadline,
      theoryPost,
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
    setDailyFoodCategory(draft.dailyFoodCategory || defaultDailyFoodCategory);
    setTheoryCategory(draft.theoryCategory || defaultTheoryCategory);
    setTheoryHeadline(draft.theoryHeadline);
    setTheoryPost(draft.theoryPost);
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
      const drafts = JSON.parse(savedDrafts) as PostDraft[];

      if (Array.isArray(drafts)) {
        loadDraftsFrame = window.requestAnimationFrame(() => {
          setMinimizedDrafts(drafts);
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
  }, [isUnlocked, resolvedMember]);

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

    const currentDraft = getCurrentDraft();
    const newDraft = createBlankDraft(nextDraftId);
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

      return {
        category: activePostCategory,
        title: dailyFoodHeadline || "untitled daily food",
        body: [dailyFoodTag1, dailyFoodTag2, dailyFoodTag3]
          .filter(Boolean)
          .join("\n"),
        anonymous: canPostAnon,
        incognito: canPostIncognito,
        author,
        shelfLabel: canPostIncognito ? incognitoShelfLabel : undefined,
        shelfCode: canPostIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          tags: [dailyFoodTag1, dailyFoodTag2, dailyFoodTag3],
          tagSources: [
            dailyFoodSource1,
            dailyFoodSource2,
            dailyFoodSource3,
          ],
          dailyFoodCode: formatDailyFoodCode(dateKey, dailyFoodOrder),
          dailyFoodCategory,
          dailyFoodOrder: dailyFoodOrder.toString(),
          sources: [
            dailyFoodSource1,
            dailyFoodSource2,
            dailyFoodSource3,
          ].filter(Boolean),
        },
      };
    }

    if (activePostCategory === "theory") {
      return {
        category: activePostCategory,
        title: theoryHeadline || "untitled theory",
        body: theoryPost,
        anonymous: canPostAnon,
        incognito: canPostIncognito,
        author,
        shelfLabel: canPostIncognito ? incognitoShelfLabel : undefined,
        shelfCode: canPostIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          sources: theorySources.map((source) => source.trim()).filter(Boolean),
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
      await saveBayPost(postPreview);
    }

    resetPostDraft();
  }

  function shakeLazyButton(target: "send" | "bank" | "bank-submit") {
    setLazyShakeTarget("");
    window.requestAnimationFrame(() => setLazyShakeTarget(target));
  }

  function sendLazyPrompt() {
    if (!lazyPrompt.trim()) {
      shakeLazyButton("send");
      return;
    }

    setLazyResponse("LA Bay-Space: assistant offline");
    setLazyPrompt("");
  }

  function openLazyBank() {
    setLazyPostPreview(null);
    setLazyBankError("");
    setIsLazyAssistantMinimized(false);
    setActivePanel("lazy-assistant");

    if (!availableBankCategories.length) {
      setLazyResponse("LA Bay-Space: Thiago engine unavailable");
      shakeLazyButton("bank");
      return;
    }

    setLazyMode("bank");
    setLazyPrompt("");
    setLazyResponse("");
  }

  function restoreLazyAssistant() {
    setIsLazyAssistantMinimized(false);
    setActivePanel("lazy-assistant");
  }

  function minimizeLazyAssistant() {
    setIsLazyAssistantMinimized(true);
    setActivePanel("id-card");
  }

  function wipeLazyAssistant() {
    setLazyMode("chat");
    setLazyPrompt("");
    setLazyResponse("");
    setLazyBankInput("");
    setLazyBankError("");
    setLazyPostPreview(null);
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
      const dateKey = getDateKey();
      const dailyFoodOrder =
        allPosts.filter(
          (post) => post.category === "daily-food" && post.dateKey === dateKey,
        ).length + 1;
      const tags = parsedPost.tags.slice(0, 3);
      const tagSources = tags.map((_, index) => parsedPost.sources[index] ?? "");

      return {
        category: "daily-food",
        title: parsedPost.title || "untitled daily food",
        body: tags.join("\n"),
        anonymous: false,
        incognito: false,
        author,
        meta: {
          tags,
          tagSources,
          dailyFoodCode: formatDailyFoodCode(dateKey, dailyFoodOrder),
          dailyFoodCategory: parsedPost.dailyFoodCategory,
          dailyFoodOrder: dailyFoodOrder.toString(),
          sources: parsedPost.sources.filter(Boolean),
        },
      };
    }

    return {
      category: "theory",
      title: parsedPost.title || "untitled theory",
      body: parsedPost.body,
      anonymous: false,
      incognito: false,
      author,
      meta: {
        sources: parsedPost.sources.filter(Boolean),
        theoryCategory: parsedPost.theoryCategory,
      },
    };
  }

  function submitLazyBank() {
    if (!availableBankCategories.length) {
      setLazyBankError("Thiago engine unavailable");
      shakeLazyButton("bank-submit");
      return;
    }

    const parsedPost = parseBankPostInput(lazyBankInput, availableBankCategories);

    if (parsedPost.error || !parsedPost.post) {
      setLazyBankError(parsedPost.error ?? "bank parse failed");
      shakeLazyButton("bank-submit");
      return;
    }

    const nextPreview = buildLazyBankPost(parsedPost.post);

    if (!nextPreview) {
      setLazyBankError("Thiago engine unavailable");
      shakeLazyButton("bank-submit");
      return;
    }

    setLazyPostPreview(nextPreview);
    setLazyBankError("");
    setLazyMode("preview");
  }

  async function confirmLazyBankPost() {
    if (
      lazyPostPreview &&
      canCreatePosts &&
      allowedPostCategories.includes(lazyPostPreview.category)
    ) {
      await saveBayPost(lazyPostPreview);
      setLazyPostPreview(null);
      setLazyBankInput("");
      setLazyBankError("");
      setLazyResponse("LA Bay-Space: bank posted");
      setLazyMode("chat");
    }
  }

  function editLazyBankPost() {
    setLazyPostPreview(null);
    setLazyBankError("");
    setLazyMode("bank");
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
    setPostCategory(availablePostCategories[0]?.id ?? "library-submission");
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
    setDailyFoodCategory(defaultDailyFoodCategory);
    setTheoryCategory(defaultTheoryCategory);
    setTheoryHeadline("");
    setTheoryPost("");
    setTheorySources(["", ""]);
    setLibraryTitle("");
    setLibrarySubmission("");
    setLibrarySources(["", ""]);
    setPostAnonymously(false);
    setPostIncognito(false);
    setIncognitoShelfLabel("");
    setIsIncognitoShelfSet(false);
    setPostPreview(null);
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
          birthdayMonth,
          birthdayYear,
          cryptiAgreementAccepted: needsCryptiAgreementAcceptance
            ? hasAcceptedCryptiAgreement
            : undefined,
          links: settingsLinks,
        },
      }),
    });
    const data = (await response.json()) as { member?: SavedMember };

    if (!response.ok || !data.member) {
      setSettingsMessage("settings not saved");
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
    successMessage: string,
  ) {
    if (!savedMember) {
      setExchangeMessage("no account found");
      return null;
    }

    setIsExchangeLoading(true);
    setExchangeMessage("");

    try {
      const response = await fetch(`/api/members/${resolvedMember}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        member?: SavedMember;
        message?: string;
      };

      if (!response.ok || !data.member) {
        setExchangeMessage(data.message ?? "exchange failed");
        return null;
      }

      setSavedMember(data.member);
      applySettingsFields(data.member);
      setExchangeMessage(successMessage);
      window.dispatchEvent(new Event("bay-space-auth"));
      return data.member;
    } finally {
      setIsExchangeLoading(false);
    }
  }

  async function exchangePointsForCoins() {
    const points = Number(exchangePoints);

    if (!Number.isFinite(points) || points < bayoCoinExchangeRate) {
      setExchangeMessage(`minimum exchange is ${bayoCoinExchangeRate} points`);
      return;
    }

    await runExchangeAction(
      {
        action: "exchange-points",
        points,
      },
      "points exchanged for Bayo Coins",
    );
    setExchangePoints("");
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
    const coins = Number(exchangeCoins);

    if (!Number.isFinite(coins) || coins < bayoTokenExchangeRate) {
      setExchangeMessage(`minimum exchange is ${bayoTokenExchangeRate} coins`);
      return;
    }

    await runExchangeAction(
      {
        action: "exchange-coins",
        coins,
      },
      "coins exchanged for tokens",
    );
    setExchangeCoins("");
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
      "stamp added",
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
        wildCard?: { pointAward?: number; rank?: string };
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
      setWildCardMessage(
        `wild card accepted - ${formatPointCount(data.wildCard?.pointAward ?? data.member.availablePoints)} points loaded`,
      );
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
        return "/daily-food";
      }

      return `/daily-food#post-${post.id}`;
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

  const header = isOptionsRoom ? null : (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-mono text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          briefing room
        </h1>
        {isUnlocked && canCreatePosts ? (
          <div className="flex w-fit flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openPostWindow}
              className="w-fit border-2 border-[#39ff14] bg-[#031403] px-5 py-3 font-mono text-sm font-black uppercase tracking-[0.24em] text-[#39ff14] shadow-[0_0_14px_rgba(57,255,20,0.28)] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              new post
            </button>
            {availableBankCategories.length ? (
              <button
                type="button"
                onClick={openLazyBank}
                className="w-fit border-2 border-dashed border-[#39ff14] bg-black px-4 py-3 text-xs font-black uppercase leading-none tracking-[0.14em] text-[#39ff14] shadow-[0_0_14px_rgba(57,255,20,0.22)] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] sm:px-5"
                aria-label="Open Lazy Assistant money-bag lane"
                title="Lazy Assistant ✅💰"
              >
                Lazy Assistant ✅💰
              </button>
            ) : null}
            <a
              href={lazyPostGptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center gap-3 border-2 border-dashed border-[#39ff14] bg-black px-4 py-2 text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              aria-label="Open Find A Story"
              title="Find A Story"
            >
              <Image
                src="/brand/bay-space-logo.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="text-left text-[0.65rem] font-black uppercase leading-3 tracking-[0.18em]">
                Find A Story
              </span>
            </a>
          </div>
        ) : null}
      </div>
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
              LA Bay-Space - [open]
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (isUnlocked) {
    return (
      <>
        {header}
        <div
          className={`${isOptionsRoom ? "mt-0" : "mt-10"} grid w-full max-w-4xl gap-6 ${
            (isPostOpen && activePanel === "post") || isOptionsRoom
              ? ""
              : "md:grid-cols-[220px_1fr]"
          }`}
        >
        {(isPostOpen && activePanel === "post") || isOptionsRoom ? null : (
        <aside className="order-2 border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)] md:order-1">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            options
          </p>
          <div className="mt-4 grid gap-3 text-sm font-black uppercase tracking-[0.12em] text-[#39ff14]">
            <button
              onClick={() => setActivePanel("id-card")}
              className={`border px-3 py-2 text-left ${
                activePanel === "id-card"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              ID CARD
            </button>
            <button
              onClick={() => setActivePanel("exchange")}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "exchange"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              Exchange
            </button>
            <button
              onClick={() => setActivePanel("circles")}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "circles"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              Circles
            </button>
            <Link
              href={`/profile/${resolvedMember}`}
              className="border border-[#1d7f12] px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)]"
            >
              Profile
            </Link>
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
              onClick={() => {
                setActivePanel("lazy-assistant");
                setIsLazyAssistantMinimized(false);
                setLazyResponse(
                  (response) => response || "LA Bay-Space: coming soon",
                );
                setLazyBankError("");
              }}
              className={`border px-3 py-2 text-left normal-case transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "lazy-assistant"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              LA Bay-Space
            </button>
            {isAdminMember ? (
              <Link
                href="/admin/analytics"
                className="border border-[#72d7ff] px-3 py-2 text-left transition hover:border-[#72d7ff] hover:bg-[#72d7ff] hover:text-black hover:shadow-[0_0_12px_rgba(114,215,255,0.35)]"
              >
                analytics
              </Link>
            ) : null}
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
          className={`briefing-panel-surface border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)] ${
            (isPostOpen && activePanel === "post") || isOptionsRoom
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
                </article>
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
                      rolling headline{" "}
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
                      label: "tag 1",
                      value: dailyFoodTag1,
                      setValue: setDailyFoodTag1,
                      source: dailyFoodSource1,
                      setSource: setDailyFoodSource1,
                      sourceOpen: dailyFoodSourceOpen1,
                      setSourceOpen: setDailyFoodSourceOpen1,
                    },
                    {
                      label: "tag 2",
                      value: dailyFoodTag2,
                      setValue: setDailyFoodTag2,
                      source: dailyFoodSource2,
                      setSource: setDailyFoodSource2,
                      sourceOpen: dailyFoodSourceOpen2,
                      setSourceOpen: setDailyFoodSourceOpen2,
                    },
                    {
                      label: "tag 3",
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
                      categories
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
                      theory{" "}
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
                        wont show up on public page
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
                    { id: "daily-food", label: "Daily Food" },
                    { id: "theory", label: "Theories" },
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
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                  LA Bay-Space
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={minimizeLazyAssistant}
                    className="grid h-7 w-7 place-items-center border border-[#1d7f12] text-sm font-black text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    aria-label="Minimize LA Bay-Space"
                    title="Minimize"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={wipeLazyAssistant}
                    className="grid h-7 w-7 place-items-center border border-[#ff3b3b] text-sm font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                    aria-label="Wipe LA Bay-Space"
                    title="Wipe"
                  >
                    x
                  </button>
                </div>
              </div>
              {lazyMode === "preview" && lazyPostPreview ? (
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
                        Daily Food - {lazyPostPreview.meta.dailyFoodCategory}
                      </p>
                    ) : null}
                    {lazyPostPreview.category === "theory" &&
                    typeof lazyPostPreview.meta?.theoryCategory === "string" &&
                    lazyPostPreview.meta.theoryCategory ? (
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                        Theories - {lazyPostPreview.meta.theoryCategory}
                      </p>
                    ) : null}
                    <h2 className="mt-3 text-xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
                      {lazyPostPreview.title}
                    </h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#d7ffd0]">
                      {lazyPostPreview.body || "no body entered"}
                    </p>
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
                  </article>
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
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                      ✅💰 Bay-Space engine:{" "}
                      <span className="text-[#39ff14]">
                        {availableBankCategories.length
                          ? `${baySpaceLazyEngineLabel} / auto route`
                          : "unavailable"}
                      </span>
                    </p>
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
                  </div>
                  <p className="mt-4 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-xs font-black uppercase leading-5 tracking-[0.16em] text-[#d7ffd0]">
                    Paste draft. Press ✅💰 or hit Enter; Thiago does the rest 😎𝌗
                  </p>
                  <textarea
                    aria-label="BaySpace Thiago money-bag intake"
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
                  <button
                    type="button"
                    onClick={submitLazyBank}
                    onAnimationEnd={() => setLazyShakeTarget("")}
                    className={`mt-5 border-2 border-dashed border-[#39ff14] px-8 py-4 text-3xl font-black text-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.28)] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                      lazyShakeTarget === "bank-submit"
                        ? "animate-[option-shake_180ms_linear]"
                        : ""
                    }`}
                    aria-label="Submit BaySpace Thiago money-bag post"
                  >
                    ✅💰
                  </button>
                </div>
              ) : (
                <div className="mt-5 border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
                  <div
                    className="min-h-[14rem] border border-[#1d7f12] bg-[#001100] px-4 py-4 font-mono text-base font-bold leading-7 text-[#39ff14]"
                    aria-live="polite"
                  >
                    {lazyResponse || "\u00a0"}
                  </div>
                  <textarea
                    aria-label="LA Bay-Space message"
                    value={lazyPrompt}
                    onChange={(event) => setLazyPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendLazyPrompt();
                      }
                    }}
                    rows={6}
                    className="mt-4 min-h-[10rem] w-full resize-y border border-[#1d7f12] bg-[#001100] px-4 py-4 font-mono text-base font-bold leading-7 text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                  />
                  <div className="mt-6 flex flex-wrap items-center gap-6">
                    <button
                      type="button"
                      onClick={sendLazyPrompt}
                      onAnimationEnd={() => setLazyShakeTarget("")}
                      className={`inline-flex h-16 min-w-24 items-center justify-center whitespace-nowrap border border-[#39ff14] px-5 text-3xl leading-none text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                        lazyShakeTarget === "send"
                          ? "animate-[option-shake_180ms_linear]"
                          : ""
                      }`}
                      aria-label="Send to LA Bay-Space"
                    >
                      🌀
                    </button>
                    <a
                      href={lazyPostGptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-16 min-w-24 items-center justify-center whitespace-nowrap border border-[#39ff14] px-5 text-3xl leading-none text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                      aria-label="Open LA Bay-Space GPT"
                    >
                      <Image
                        src="/brand/bay-space-logo.png"
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 object-contain"
                      />
                    </a>
                    <button
                      type="button"
                      onClick={openLazyBank}
                      onAnimationEnd={() => setLazyShakeTarget("")}
                      className={`inline-flex h-16 min-w-32 items-center justify-center whitespace-nowrap border border-[#39ff14] px-5 text-3xl leading-none text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                        lazyShakeTarget === "bank"
                          ? "animate-[option-shake_180ms_linear]"
                          : ""
                      }`}
                      aria-label="Open BaySpace Thiago money-bag lane"
                    >
                      ✅💰
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              <div className="mt-5 grid gap-4">
                <details className="border-2 border-[#39ff14] bg-[#001100] p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
                  <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]">
                    Point Exchange
                  </summary>
                  <div className="mt-4 grid gap-3 text-sm font-black uppercase tracking-[0.14em] text-[#d7ffd0] sm:grid-cols-3">
                    <p>
                      available points
                      <span className="mt-2 block text-xl text-[#39ff14]">
                        {formatPointCount(savedMember.availablePoints)}
                      </span>
                    </p>
                    <p>
                      Bayo Coins
                      <span className="mt-2 block text-xl text-[#39ff14]">
                        {formatPointCount(savedMember.bayoCoins)}
                      </span>
                    </p>
                    <p>
                      exchange rate
                      <span className="mt-2 block text-xl text-[#39ff14]">
                        {bayoCoinExchangeRate}:1
                      </span>
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                        points to trade
                      </span>
                      <input
                        inputMode="numeric"
                        value={exchangePoints}
                        onChange={(event) => {
                          setExchangePoints(
                            event.target.value.replace(/\D/g, "").slice(0, 8),
                          );
                          setExchangeMessage("");
                        }}
                        placeholder={String(bayoCoinExchangeRate)}
                        className="w-40 border border-[#1d7f12] bg-black px-3 py-2 text-sm font-black text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={exchangePointsForCoins}
                      disabled={isExchangeLoading}
                      className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent"
                    >
                      trade for coins
                    </button>
                  </div>
                </details>

                <details className="border-2 border-[#1d7f12] bg-black p-4 shadow-[0_0_14px_rgba(57,255,20,0.12)]">
                  <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]">
                    Token Exchange
                  </summary>
                  <div className="mt-4 grid gap-3 text-sm font-black uppercase tracking-[0.14em] text-[#d7ffd0] sm:grid-cols-3">
                    <p>
                      Bayo Coins
                      <span className="mt-2 block text-xl text-[#39ff14]">
                        {formatPointCount(savedMember.bayoCoins)}
                      </span>
                    </p>
                    <p>
                      tokens
                      <span className="mt-2 block text-xl text-[#39ff14]">
                        {formatPointCount(savedMember.bayoTokens)}
                      </span>
                    </p>
                    <p>
                      exchange rate
                      <span className="mt-2 block text-xl text-[#39ff14]">
                        {bayoTokenExchangeRate}:1
                      </span>
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                        coins to trade
                      </span>
                      <input
                        inputMode="numeric"
                        value={exchangeCoins}
                        onChange={(event) => {
                          setExchangeCoins(
                            event.target.value.replace(/\D/g, "").slice(0, 8),
                          );
                          setExchangeMessage("");
                        }}
                        placeholder={String(bayoTokenExchangeRate)}
                        className="w-40 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={exchangeCoinsForTokens}
                      disabled={isExchangeLoading}
                      className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent"
                    >
                      trade for tokens
                    </button>
                  </div>
                </details>

                {exchangeMessage ? (
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                    {exchangeMessage}
                  </p>
                ) : null}

                <details className="border-2 border-[#1d7f12] bg-black p-4 shadow-[0_0_14px_rgba(57,255,20,0.12)]">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]">
                    Badge Quest
                  </summary>
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
                              (savedMember.bayoCoins ?? 0) < graduationCoinCost
                            }
                            className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent"
                          >
                            {isGraduated
                              ? "owned"
                              : `${graduationCoinCost} coins`}
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
                      const isPromotionGate = isTokenGateKey(gateKey.id);
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
                      const gateRequirementsMet =
                        gateKey.id === "crypti-plus"
                          ? isGraduated
                          : gateKey.id === "instant-rank-promotion"
                            ? hasCryptiPlus
                            : isInstantRankPromotionII
                              ? hasRequiredPromotion
                              : isGraduated;
                      const purchaseBalance = isPromotionGate
                        ? (savedMember.bayoTokens ?? 0)
                        : (savedMember.bayoCoins ?? 0);
                      const canBuy =
                        isGraduated &&
                        !isOwned &&
                        gateRequirementsMet &&
                        purchaseBalance >= gateKey.coinCost;
                      const costUnit = isPromotionGate ? "tokens" : "coins";

                      return (
                        <div
                          key={gateKey.id}
                          className={`grid gap-3 border p-4 sm:grid-cols-[1fr_auto] sm:items-center ${
                            isCryptiGate || isPromotionGate
                              ? "border-[#72d7ff] text-[#d7f5ff]"
                              : "border-[#1d7f12] text-[#d7ffd0]"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.18em]">
                              {gateKey.label}
                            </p>
                            <p className="mt-2 text-xs font-bold uppercase leading-5 tracking-[0.12em] text-[#7f9f78]">
                              {gateKey.description}
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
                                ? `${gateKey.coinCost} ${costUnit}`
                                : "locked"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </details>

                <details className="border-2 border-[#1d7f12] bg-black p-4 shadow-[0_0_14px_rgba(57,255,20,0.12)]">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]">
                    Cards
                  </summary>
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
                              tokens
                              <span className="mt-2 block text-xl text-[#39ff14]">
                                {formatPointCount(savedMember.bayoTokens)}
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
                                (savedMember.bayoTokens ?? 0) >= card.tokenCost;
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
                                  ? `${formatPointCount(card.tokenCost)} tokens`
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

                <details className="border-2 border-[#1d7f12] bg-black p-4 shadow-[0_0_14px_rgba(57,255,20,0.12)]">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0] transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]">
                    Stamps
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-3 border border-[#1d7f12] bg-[#001100] p-4 text-xs font-black uppercase leading-5 tracking-[0.14em] text-[#d7ffd0] sm:grid-cols-2">
                      <p>
                        Bayo Coins
                        <span className="mt-2 block text-xl text-[#39ff14]">
                          {formatPointCount(savedMember.bayoCoins)}
                        </span>
                      </p>
                      <p>
                        rule
                        <span className="mt-2 block text-[#7f9f78]">
                          stamps are identity collectibles and appear in the
                          profile Trophy Case once owned.
                        </span>
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {bayoStamps.map((stamp) => {
                        const isOwned = savedMember.bayoStamps?.includes(stamp.id);
                        const canBuy =
                          !isOwned &&
                          (savedMember.bayoCoins ?? 0) >= stamp.coinCost;
                        const costLabel =
                          stamp.coinCost === 0
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
                  <div className="flex flex-wrap gap-3">
                    <input
                      inputMode="numeric"
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
                      href={baySpaceAgreementHref}
                      target="_blank"
                      rel="external noopener noreferrer"
                      onClick={(event) => {
                        if (openExternalBrowser(baySpaceAgreementHref)) {
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

                <div className="border-t border-[#1d7f12] pt-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    support
                  </p>
                  <a
                    href={`mailto:${supportEmail}?subject=Name%20Change`}
                    className="mt-3 inline-flex max-w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    {supportEmail}
                  </a>
                  <p className="mt-3 text-xs font-bold uppercase leading-5 tracking-[0.14em] text-[#7f9f78]">
                    subject line example: Name Change
                  </p>
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
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : activePanel === "id-card" && savedMember ? (
            <div>
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
                    className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14] disabled:text-[#7f9f78]"
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
                RANK: LEVEL {getBayRankLevel(savedMember.rank)} -{" "}
                {getBayRankLabel(savedMember.rank)}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#72d7ff]">
                +CRYPTI RANK: {getCryptiRankLabel(savedMember.cryptiRank) || "-"}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                POINTS: {formatPointCount(savedMember.availablePoints)} available
                / {formatPointCount(savedMember.lifetimePoints)} lifetime
              </p>
              {promotionProgress ? (
                <p
                  className={`mt-4 text-sm font-black uppercase tracking-[0.2em] ${
                    promotionProgress.track === "crypti"
                      ? "text-[#72d7ff]"
                      : "text-[#d7ffd0]"
                  }`}
                >
                  POINTS UNTIL {promotionProgress.label}:{" "}
                  {formatPointCount(promotionProgress.pointsUntil)}
                </p>
              ) : (
                <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                  POINTS UNTIL NEXT PROMOTION: 0
                </p>
              )}
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                BAYO COINS: {formatPointCount(savedMember.bayoCoins)}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                NAME: {savedMember.name}
                {isBayoClubMember ? " 🦉" : ""}
              </p>
              <TicketVoteCounter />
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
      </>
    );
  }

  if (isCheckingSession) {
    return (
      <>
        {header}
        <div className="mt-10 w-full max-w-md border-l-2 border-[#39ff14] pl-4 text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
          syncing access
        </div>
      </>
    );
  }

  if (resolvedMember) {
    return (
      <>
        {header}
        <form
          onSubmit={unlock}
          className="mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]"
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
      </>
    );
  }

  return (
    <div className="w-full max-w-xl border-2 border-[#1d7f12] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
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
  );
}
