"use client";

import BayRankBadge from "../components/bay-rank-badge";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import CopyPostLinkButton from "../components/copy-post-link-button";
import BlackLightLink from "../components/black-light-link";
import FavoriteButton from "../components/favorite-button";
import PostEngagementPanel from "../components/post-engagement-panel";
import TicketVoteButton from "../components/ticket-vote-button";
import TerminalLoadingShell from "../components/terminal-loading-shell";
import {
  BayPost,
  getBayPostsByCategory,
  postStoreEvent,
} from "../components/post-store";
import {
  countFavoritePosts,
  favoriteStoreEvent,
  getFavoritePostIds,
} from "../components/favorite-store";
import { recordArticleVisit } from "../components/post-visit-client";
import ArticleReadLight from "../components/article-read-light";
import {
  isBayoClub,
  isGhostRole,
} from "../../lib/bay-space-roles";
import type { BayPostTruthVoteSummary } from "../../lib/bay-space-types";
import {
  formatPointTenths,
  getBaySpacePostPointTenths,
  getBaySpacePostTicketCount,
} from "../../lib/bay-space-scoring";
import {
  currentEventsAntithesisPrefix,
  currentEventsBlackLightPrefix,
  dailyFoodCategories,
  defaultDailyFoodCategory,
} from "../../lib/daily-food-categories";
import {
  doPostTopicTagsIncludeTag,
  getPostTopicTags,
  getPostTopicTagSearchText,
} from "../../lib/bay-space-tags";
import styles from "../theories/theory-experience.module.css";
import MonthlyIcebergMap from "../theories/monthly-iceberg-map";
import icebergStyles from "../theories/monthly-iceberg-map.module.css";
import { getCrestSignals } from "./crest-layout";
import CurrentEventsCategoryMap from "./current-events-category-map";

type SortMode = "attention" | "top-story" | "date" | "category";
type BrowseMode = "" | "all" | "week" | "month" | "category" | "circles";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getCurrentWeekRange(now = new Date()) {
  const start = startOfDay(now);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { end, start };
}

function getCurrentMonthRange(now = new Date()) {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type DailyFoodTag = {
  source: string;
  text: string;
};

type SavedMember = {
  rank?: string;
  member: string;
  name?: string;
  refName: string;
  roles?: string;
};

function getMetaString(post: BayPost, key: string) {
  const value = post.meta?.[key];

  return typeof value === "string" ? value : "";
}

function getPostDailyFoodCategory(post: BayPost) {
  const category = getMetaString(post, "dailyFoodCategory").trim().toLowerCase();
  return dailyFoodCategories.find((name) => name.toLowerCase() === category) ?? defaultDailyFoodCategory;
}

function getDailyFoodCategoryLabel(post: BayPost) {
  const dailyFoodCategory = getPostDailyFoodCategory(post);

  return dailyFoodCategory
    ? `Current Events - ${dailyFoodCategory}`
    : "Current Events";
}

type DfHeadlineTerminalProps = {
  onClearReference: () => void;
  onReferenceQueryChange: (value: string) => void;
  onUnlockReference: () => void;
  referenceQuery: string;
  unlockedReference: string;
};

function getPostHashId() {
  if (typeof window === "undefined") {
    return "";
  }

  const postId = window.location.hash.replace(/^#post-/, "");

  return postId === window.location.hash ? "" : postId;
}

function getTopicTagParam() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("tag") ?? "";
}

function getUrlWithoutTopicTag() {
  const searchParams = new URLSearchParams(window.location.search);

  searchParams.delete("tag");

  const queryString = searchParams.toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
}

function getTopicTagUrl(tag: string) {
  const searchParams = new URLSearchParams(window.location.search);

  searchParams.set("tag", tag);

  return `${window.location.pathname}?${searchParams.toString()}`;
}

function normalizeLookupText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function DfHeadlineTerminal({
  onClearReference,
  onReferenceQueryChange,
  onUnlockReference,
  referenceQuery,
  unlockedReference,
}: DfHeadlineTerminalProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const listRef = useRef<HTMLDivElement>(null);
  const articleHeading = useRef<HTMLHeadingElement>(null);
  const screenHeading = useRef<HTMLHeadingElement>(null);
  const searchParams = useSearchParams();
  const [browseMode, setBrowseMode] = useState<BrowseMode>(() => {
    if (unlockedReference || getPostHashId() || getTopicTagParam()) return "all";
    return searchParams.get("section") === "this-week" ? "week" : "";
  });
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [hasSyncedPosts, setHasSyncedPosts] = useState(false);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoritePostIds, setFavoritePostIds] = useState<string[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});
  const [sortMode, setSortMode] = useState<SortMode>(browseMode === "week" ? "date" : "attention");
  const [expandedPostId, setExpandedPostId] = useState("");
  const [hashPostId, setHashPostId] = useState(getPostHashId);
  const [selectedTopicTag, setSelectedTopicTag] = useState(getTopicTagParam);
  const [activeMember, setActiveMember] = useState<SavedMember | null>();
  const readerId = activeMember === undefined ? undefined : activeMember?.member ?? null;
  const [readVisit, setReadVisit] = useState<{ postId: string; readBy: string | null }>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [revealAll, setRevealAll] = useState(true);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [selectedDailyFoodCategory, setSelectedDailyFoodCategory] =
    useState("");
  const normalizedReferenceQuery = unlockedReference
    ? normalizeLookupText(unlockedReference)
    : "";
  const matchedReferencePost = normalizedReferenceQuery
    ? posts.find(
        (post) =>
          post.incognito &&
          normalizeLookupText(post.shelfCode ?? "") === normalizedReferenceQuery,
      ) ?? null
    : null;
  const matchedReferenceMember = normalizedReferenceQuery
    ? members.find(
        (savedMember) =>
          normalizeLookupText(savedMember.refName ?? "") ===
          normalizedReferenceQuery,
      ) ?? null
    : null;
  const isReferenceMode = Boolean(normalizedReferenceQuery);
  const isReferenceMemberMode = Boolean(matchedReferenceMember);
  const activePosts = getVisiblePosts();
  const expandedPost =
    activePosts.find((post) => post.id === expandedPostId) ?? null;
  const hashPost =
    posts.find((post) => post.id === hashPostId && !post.incognito) ?? null;
  const displayedPost = matchedReferencePost ?? hashPost ?? expandedPost;
  const displayedPostId = displayedPost?.id ?? "";
  const isPeriodView = browseMode === "week" || browseMode === "month";
  const showCrestMap = isPeriodView && hasSyncedPosts && !displayedPost && !isReferenceMode && !selectedTopicTag;
  const displayedPostScore = displayedPost
    ? formatPointTenths(
        getBaySpacePostPointTenths(displayedPost, favoritePostCounts),
      )
    : "0";
  const categoryPosts = selectedDailyFoodCategory
    ? sortPosts(
        posts.filter(
          (post) =>
            !post.incognito &&
            getPostDailyFoodCategory(post) === selectedDailyFoodCategory,
        ),
      )
    : [];

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("daily-food").then((nextPosts) => {
        setPosts(nextPosts);
        setHasSyncedPosts(true);
      });
    }

    async function syncLogin() {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = response.ok
        ? ((await response.json()) as { member?: SavedMember | null })
        : { member: null };
      const member = data.member ?? null;

      setActiveMember(member);
      setIsLoggedIn(Boolean(member));
    }

    function syncMembers() {
      fetch("/api/members", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : { members: [] }))
        .then((data: { members?: SavedMember[] }) => {
          setMembers(data.members ?? []);
        });
    }

    async function syncFavorites() {
      setFavoritePostIds(await getFavoritePostIds());
    }

    syncPosts();
    syncLogin();
    syncMembers();
    syncFavorites();
    window.addEventListener("storage", syncPosts);
    window.addEventListener(postStoreEvent, syncPosts);
    window.addEventListener("storage", syncLogin);
    window.addEventListener("bay-space-auth", syncLogin);
    window.addEventListener("storage", syncFavorites);
    window.addEventListener("bay-space-auth", syncFavorites);
    window.addEventListener(favoriteStoreEvent, syncFavorites);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(postStoreEvent, syncPosts);
      window.removeEventListener("storage", syncLogin);
      window.removeEventListener("bay-space-auth", syncLogin);
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener("bay-space-auth", syncFavorites);
      window.removeEventListener(favoriteStoreEvent, syncFavorites);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncFavoriteCounts() {
      const counts = await countFavoritePosts(posts.map((post) => post.id));

      if (isMounted) {
        setFavoritePostCounts(counts);
      }
    }

    syncFavoriteCounts();
    window.addEventListener(favoriteStoreEvent, syncFavoriteCounts);
    window.addEventListener(postStoreEvent, syncFavoriteCounts);

    return () => {
      isMounted = false;
      window.removeEventListener(favoriteStoreEvent, syncFavoriteCounts);
      window.removeEventListener(postStoreEvent, syncFavoriteCounts);
    };
  }, [posts]);

  useEffect(() => {
    function syncPostHash() {
      setHashPostId(getPostHashId());
    }

    window.addEventListener("hashchange", syncPostHash);

    return () => {
      window.removeEventListener("hashchange", syncPostHash);
    };
  }, []);

  useEffect(() => {
    if (!displayedPostId || readerId === undefined) {
      return;
    }

    let isMounted = true;

    recordArticleVisit(displayedPostId, { readerId })
      .then((visit) => {
        if (!isMounted || !visit) return;

        setReadVisit({ postId: displayedPostId, readBy: visit.readBy });
        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post.id === displayedPostId
              ? {
                  ...post,
                  meta: {
                    ...(post.meta ?? {}),
                    postVisits: String(visit.postVisits),
                  },
                }
              : post,
          ),
        );
      });

    return () => {
      isMounted = false;
    };
  }, [displayedPostId, readerId]);

  function getVisiblePosts() {
    if (selectedTopicTag) {
      return sortPosts(
        posts
        .filter(
          (post) =>
            !post.incognito && doPostTopicTagsIncludeTag(post, selectedTopicTag),
        ),
      );
    }

    if (!isReferenceMode) {
      const publicPosts = posts.filter((post) => !post.incognito);

      if (browseMode === "week") {
        const { end, start } = getCurrentWeekRange(today);
        return sortPosts(
          publicPosts
          .filter((post) => {
            const createdAt = new Date(post.createdAt);
            return createdAt >= start && createdAt < end;
          }),
        );
      }

      if (browseMode === "month") {
        const { end, start } = getCurrentMonthRange(today);
        return sortPosts(
          publicPosts
          .filter((post) => {
            const createdAt = new Date(post.createdAt);
            return createdAt >= start && createdAt < end;
          }),
        );
      }

      if (browseMode === "category" && selectedDailyFoodCategory) {
        return sortPosts(
          publicPosts
          .filter(
            (post) =>
              getPostDailyFoodCategory(post) === selectedDailyFoodCategory,
          ),
        );
      }

      return sortPosts(publicPosts);
    }

    if (matchedReferencePost) {
      return [matchedReferencePost];
    }

    if (!matchedReferenceMember) {
      return sortPosts(
        posts.filter((post) => !post.incognito && doesPostMatchLookup(post)),
      );
    }

    return sortPosts(
      posts.filter(
        (post) =>
          post.incognito &&
          post.author === matchedReferenceMember.member,
      ),
    );
  }

  function doesPostMatchLookup(post: BayPost) {
    const authorRef =
      members.find((member) => member.member === post.author)?.refName ?? "";
    const searchableText = normalizeLookupText(
      [
        post.title,
        post.body,
        getAuthorName(post),
        authorRef,
        getMetaString(post, "dailyFoodCode"),
        post.shelfCode ?? "",
        getDailyFoodTags(post)
          .map((tag) => tag.text)
          .join(" "),
        getPostSources(post).join(" "),
        getDailyFoodCategoryLabel(post),
        getPostTopicTagSearchText(post),
      ].join(" "),
    );

    return searchableText.includes(normalizedReferenceQuery);
  }

  function sortPosts(postsToSort: BayPost[]) {
    const newestFirst = (leftPost: BayPost, rightPost: BayPost) =>
      new Date(rightPost.createdAt).getTime() -
      new Date(leftPost.createdAt).getTime();
    const getMetaCount = (post: BayPost, key: string) => {
      const count = Number(post.meta?.[key]);
      return Number.isFinite(count) && count > 0 ? count : 0;
    };
    const getAttentionScore = (post: BayPost) =>
      getMetaCount(post, "postVisits") +
      getMetaCount(post, "commentCount") * 10 +
      getMetaCount(post, "truthVoteCount") * 3;

    return [...postsToSort].sort((leftPost, rightPost) => {
      if (sortMode === "category") {
        const categoryDifference = getPostDailyFoodCategory(leftPost).localeCompare(
          getPostDailyFoodCategory(rightPost),
        );
        return categoryDifference || newestFirst(leftPost, rightPost);
      }

      if (sortMode === "top-story") {
        const scoreDifference =
          getBaySpacePostPointTenths(rightPost, favoritePostCounts) -
          getBaySpacePostPointTenths(leftPost, favoritePostCounts);
        return scoreDifference || newestFirst(leftPost, rightPost);
      }

      if (sortMode === "attention") {
        const attentionDifference =
          getAttentionScore(rightPost) - getAttentionScore(leftPost);
        return attentionDifference || newestFirst(leftPost, rightPost);
      }

      return newestFirst(leftPost, rightPost);
    });
  }

  function getPostMarker(post: BayPost) {
    if (isReferenceMemberMode && post.incognito) {
      return "?";
    }

    const order = getMetaString(post, "dailyFoodOrder");

    return order ? `#${order}` : "";
  }

  function isPostRevealed(post: BayPost) {
    return revealAll && (!post.incognito || isReferenceMemberMode);
  }

  function scrollList(direction: number) {
    listRef.current?.scrollBy({
      behavior: "smooth",
      top: direction * 160,
    });
  }

  function clearTopicTag() {
    setSelectedTopicTag("");
    setExpandedPostId("");
    setHashPostId("");
    window.history.replaceState(null, "", getUrlWithoutTopicTag());
  }

  function openTopicTag(tag: string) {
    setBrowseMode("all");
    setSelectedTopicTag(tag);
    setExpandedPostId("");
    setHashPostId("");
    setIsCategoriesOpen(false);
    setSelectedDailyFoodCategory("");
    onClearReference();
    window.history.replaceState(null, "", getTopicTagUrl(tag));
  }

  function getPostSources(post: BayPost) {
    const tagSources = post.meta?.tagSources;
    const sources = Array.isArray(tagSources) ? tagSources : post.meta?.sources;

    return Array.isArray(sources) ? sources.filter(Boolean) : [];
  }

  function getTicketVoteCount(post: BayPost) {
    return getBaySpacePostTicketCount(post);
  }

  function getDailyFoodTags(post: BayPost): DailyFoodTag[] {
    const tags = post.meta?.tags;
    const tagSources = post.meta?.tagSources;

    if (Array.isArray(tags)) {
      return tags
        .map((tag, index) => ({
          text: tag,
          source: Array.isArray(tagSources) ? tagSources[index] ?? "" : "",
        }))
        .filter((tag) => tag.text);
    }

    const fallbackSources = getPostSources(post);

    return post.body
      .split("\n")
      .filter(Boolean)
      .map((tag, index) => ({
        text: tag,
        source: fallbackSources[index] ?? "",
      }));
  }

  function getSourceHref(source: string) {
    return source.startsWith("http://") || source.startsWith("https://")
      ? source
      : `https://${source}`;
  }

  function getAuthorName(post: BayPost) {
    return members.find((member) => member.member === post.author)?.name?.trim() ?? "";
  }

  function getAuthorRoles(post: BayPost) {
    return members.find((member) => member.member === post.author)?.roles ?? "";
  }

  function getAuthorDisplayName(post: BayPost) {
    const authorName = getAuthorName(post);

    if (!authorName) {
      return "";
    }

    return isBayoClub(getAuthorRoles(post)) ? `${authorName} 🦉` : authorName;
  }

  function shouldClassifyAuthor(post: BayPost) {
    return (
      post.anonymous ||
      (isGhostRole(getAuthorRoles(post)) && !favoritePostIds.includes(post.id))
    );
  }

  function canShowAuthor(post: BayPost) {
    return !post.incognito && !shouldClassifyAuthor(post) && getAuthorName(post);
  }

  function canBayoOpenClassifiedAuthor(post: BayPost) {
    return (
      !post.incognito &&
      shouldClassifyAuthor(post) &&
      post.author !== "unknown" &&
      isBayoClub(activeMember?.roles ?? "")
    );
  }

  function canShowBayoPlusAnonProfile(post: BayPost) {
    return post.anonymous && post.author !== "unknown" && isBayoClub(getAuthorRoles(post));
  }

  function getPostLinkPath(post: BayPost) {
    return post.incognito ? "/facts-on-news" : `/facts-on-news#post-${post.id}`;
  }

  function syncPostTruthSummary(
    postId: string,
    summary: BayPostTruthVoteSummary,
  ) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              meta: {
                ...(post.meta ?? {}),
                truthAverageScore: summary.averageScore.toFixed(1),
                truthPointTenths: String(summary.pointValue * 10),
                truthScoreTotal: String(summary.scoreTotal),
                truthVoteCount: String(summary.voteCount),
              },
            }
          : post,
      ),
    );
  }

  function openCategoryPost(post: BayPost) {
    setExpandedPostId("");
    setHashPostId(post.id);
    setSelectedTopicTag("");
    setIsCategoriesOpen(false);
    window.history.replaceState(
      null,
      "",
      `${getUrlWithoutTopicTag()}#post-${post.id}`,
    );
  }

  const isMainScreen = browseMode === "";
  const screenTitle =
    browseMode === "week"
      ? "THIS WEEK"
      : browseMode === "month"
        ? "THIS MONTH"
        : browseMode === "category"
          ? selectedDailyFoodCategory || "CURRENT EVENTS CATEGORIES"
          : browseMode === "circles"
            ? "CIRCLES"
            : "CURRENT EVENTS";
  const screenPath =
    browseMode === "week"
      ? "c:\\bay-space\\current-events\\this-week"
      : browseMode === "month"
        ? "c:\\bay-space\\current-events\\this-month"
        : browseMode === "category"
          ? selectedDailyFoodCategory
            ? `c:\\bay-space\\current-events\\categories\\${selectedDailyFoodCategory
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`
            : "c:\\bay-space\\current-events\\categories"
          : browseMode === "circles"
            ? "c:\\bay-space\\current-events\\circles"
            : "c:\\bay-space\\current-events> main";

  function openBrowseMode(mode: Exclude<BrowseMode, "" | "all">) {
    setBrowseMode(mode);
    if (mode === "week") setSortMode("date");
    setExpandedPostId("");
    setHashPostId("");
    setSelectedTopicTag("");
    setSelectedDailyFoodCategory("");
    setIsCategoriesOpen(mode === "category");
    onClearReference();
    window.history.replaceState(null, "", window.location.pathname);
  }

  function returnToMainScreen() {
    setBrowseMode("");
    setExpandedPostId("");
    setHashPostId("");
    setSelectedTopicTag("");
    setSelectedDailyFoodCategory("");
    setIsCategoriesOpen(false);
    setSortMode("attention");
    onClearReference();
    window.history.replaceState(null, "", window.location.pathname);
  }

  const resetFromHeader = useEffectEvent(returnToMainScreen);
  useEffect(() => {
    function reset() {
      resetFromHeader();
    }
    window.addEventListener("bay-space-return-to-feed-home", reset);
    return () => window.removeEventListener("bay-space-return-to-feed-home", reset);
  }, []);

  function goBackOneScreen() {
    if (isPeriodView && displayedPost) {
      setExpandedPostId("");
      return;
    }
    if (browseMode === "category" && selectedDailyFoodCategory) {
      setSelectedDailyFoodCategory("");
      setExpandedPostId("");
      setHashPostId("");
      setIsCategoriesOpen(true);
      window.history.replaceState(null, "", getUrlWithoutTopicTag());
      return;
    }

    returnToMainScreen();
  }

  const hasActiveFeed =
    browseMode === "week" ||
    browseMode === "month" ||
    browseMode === "all" ||
    isReferenceMode ||
    Boolean(selectedTopicTag) ||
    (browseMode === "category" && Boolean(selectedDailyFoodCategory));

  function openCrestStory(postId: string) {
    setExpandedPostId(postId);
    window.requestAnimationFrame(() => articleHeading.current?.focus());
  }

  return (
    <div className={`${styles.board} ${styles.currentEventsBoard} grid w-full min-w-0 max-w-5xl grid-cols-1 gap-8`}>
      <header className={`${styles.screenHeader} relative flex flex-wrap items-start justify-between gap-5`}>
        <div className={`w-full ${!isMainScreen ? "sm:pr-72" : ""}`}>
          <p className={`${styles.breadcrumb} mb-4 text-sm uppercase text-[#bfd0bc]`}>
            {screenPath}
          </p>
          <h1 ref={screenHeading} tabIndex={-1} className={`${styles.screenTitle} max-w-[18ch] text-4xl font-black uppercase text-[#72c16a] sm:text-6xl`}>
            {screenTitle}
          </h1>
        </div>
        {!isMainScreen ? (
          <button
            type="button"
            onClick={goBackOneScreen}
            className={`${styles.backButton} bay-terminal-copy px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#bfd0bc] sm:absolute sm:right-0 sm:top-0`}
          >
            ← back / {isPeriodView && displayedPost ? "story map" : browseMode === "category" && selectedDailyFoodCategory
              ? "current events categories"
              : "current events > main"}
          </button>
        ) : null}
      </header>

      {isMainScreen ? (
        <>
          <figure className={`${icebergStyles.crestArt} ${icebergStyles.crestHero}`}>
            <figcaption>Above the waterline</figcaption>
          </figure>
          <section
            className={`${styles.entryGrid} order-1 grid gap-4 sm:grid-cols-2`}
            aria-label="Choose Current Events view"
          >
            {[
              {
                description: "The stories and signals published since Monday.",
                label: "THIS WEEK",
                mode: "week" as const,
              },
              {
                description: "A wider look across the current calendar month.",
                label: "THIS MONTH",
                mode: "month" as const,
              },
              {
                description: "Follow current events by subject and signal type.",
                label: "CATEGORIES",
                mode: "category" as const,
              },
              {
                description: "Gather around an event and follow it together.",
                label: "CIRCLES",
                mode: "circles" as const,
              },
            ].map((option, index) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => openBrowseMode(option.mode)}
                className={`${styles.entryCard} text-left focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]`}
              >
                <span className={styles.entryNumber}>0{index + 1}</span>
                <span className={styles.entryLabel}>{option.label}</span>
                <span className={styles.entryDescription}>{option.description}</span>
                <span className={styles.entryArrow} aria-hidden="true">→</span>
              </button>
            ))}
          </section>
        </>
      ) : null}

      {showCrestMap ? (
        <MonthlyIcebergMap
          key={readerId ?? (readerId === null ? "guest" : "loading")}
          variant="crest"
          signals={getCrestSignals(activePosts, getPostDailyFoodCategory)}
          readerId={readerId}
          onOpenStory={openCrestStory}
        />
      ) : null}

      {browseMode === "category" && isCategoriesOpen && !selectedDailyFoodCategory ? (
        <CurrentEventsCategoryMap onSelectCategory={(category) => {
          setSelectedDailyFoodCategory(category);
          window.requestAnimationFrame(() => screenHeading.current?.focus());
        }} />
      ) : null}

      {browseMode === "circles" ? (
        <section className={`${styles.surface} order-1 px-6 py-8`}>
          <p className="bay-terminal-copy text-xs text-[#72c16a]">COMING SOON</p>
          <p className="bay-terminal-field mt-4 max-w-2xl text-sm leading-7 text-[#bfd0bc]">
            Community circles for following one developing current event together
            are on the way.
          </p>
        </section>
      ) : null}

      {hasActiveFeed || browseMode === "category" ? (
      <div className={`${styles.controlBar} ${styles.currentEventsControls} order-3 flex flex-wrap items-end gap-4`}>
        <Link
          href="/news"
          className={`${styles.currentEventsAction} grid min-h-12 place-items-center border px-6 py-3 text-sm font-black uppercase tracking-[0.2em] transition focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]`}
        >
          Top Story
        </Link>
        <button
          type="button"
          onClick={() => openBrowseMode("category")}
          className={`${styles.currentEventsAction} min-h-12 border px-6 py-3 text-sm font-black uppercase tracking-[0.2em] transition focus:outline-none focus:ring-2 focus:ring-[#bfd0bc] ${
            isCategoriesOpen
              ? "border-[#39ff14] bg-[#39ff14] text-black shadow-[0_0_16px_rgba(57,255,20,0.5)]"
              : "border-[#1d7f12] bg-black text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
          }`}
        >
          Categories
        </button>
        <form
          id="daily-food-reference"
          onSubmit={(event) => {
            event.preventDefault();
            setBrowseMode("all");
            setIsCategoriesOpen(false);
            onUnlockReference();
          }}
          className={`${styles.currentEventsSearch} flex w-fit flex-wrap items-center gap-3 border px-3 py-2`}
        >
          <input
            value={referenceQuery}
            onChange={(event) => onReferenceQueryChange(event.target.value)}
            placeholder="search"
            className={`${styles.currentEventsInput} w-52 border px-3 py-2 text-sm font-black uppercase tracking-[0.14em] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#72c16a]`}
          />
          <button
            type="submit"
            className={`${styles.currentEventsAction} grid h-10 w-10 place-items-center border text-xl leading-none transition focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]`}
            aria-label="Search Current Events"
          >
            🌀
          </button>
        </form>
        <label className="grid w-fit gap-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
            sort posts by
          </span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className={`${styles.currentEventsInput} border px-3 py-2 text-sm font-black uppercase tracking-[0.16em] outline-none focus:ring-2 focus:ring-[#72c16a]`}
          >
            <option value="attention">Attention</option>
            <option value="top-story">Top Story</option>
            <option value="date">Most Recent</option>
            <option value="category">Category</option>
          </select>
        </label>
        {!isPeriodView ? <label className={`${styles.currentEventsToggle} flex min-h-12 w-fit items-center gap-3 border px-4 py-2 text-xs font-black uppercase tracking-[0.18em]`}>
          <span>reveal posts</span>
          <input
            type="checkbox"
            checked={revealAll}
            onChange={(event) => setRevealAll(event.target.checked)}
            className="peer sr-only"
          />
          <span className="relative h-5 w-10 rounded-full border border-[#4f8f49] bg-[#071008] transition peer-checked:border-[#72c16a] peer-checked:bg-[#72c16a] after:absolute after:left-1 after:top-1/2 after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-[#72c16a] after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-[#071008]" />
        </label> : null}
      </div>
      ) : null}

      {!showCrestMap && hasActiveFeed ? (
      <div
        className={`${styles.surface} ${styles.currentEventsFeed} relative order-1 min-h-40 w-full overflow-hidden px-5 py-8`}
      >
        {isCategoriesOpen && selectedDailyFoodCategory ? (
          categoryPosts.length ? (
            <div className="grid max-h-[28rem] gap-3 overflow-y-auto pr-2">
              {categoryPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => openCategoryPost(post)}
                  className="daily-food-category-button border border-[#39ff14]/45 bg-black/80 px-4 py-4 text-left text-[#d7ffd0] shadow-[0_0_10px_rgba(57,255,20,0.1)] transition hover:border-[#39ff14] hover:bg-[#031403] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  <span className="block text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                    {formatTimestamp(post.createdAt)}
                  </span>
                  <span className="mt-2 block text-sm font-black uppercase tracking-[0.14em]">
                    {post.title}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="border-l-2 border-[#39ff14] pl-4 text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
              no posts filed in this category
            </p>
          )
        ) : !hasSyncedPosts ? (
          <TerminalLoadingShell
            label="c:\\bay-space\\facts-on-news> syncing-feed"
            title="current events"
          />
        ) : displayedPost ? (
          <article className={`${styles.currentEventExpandedArticle} relative min-w-0 border px-5 py-5`}>
            <div className="absolute right-4 top-3 flex items-center gap-3">
              <p className="text-right text-xs font-black uppercase tracking-[0.16em] text-[#8fc788]">
                {displayedPostScore} pts
              </p>
              <FavoriteButton
                onCountChange={(count) =>
                  setFavoritePostCounts((counts) => ({
                    ...counts,
                    [displayedPost.id]: count,
                  }))
                }
                postId={displayedPost.id}
              />
              <TicketVoteButton
                initialCount={getTicketVoteCount(displayedPost)}
                onCountChange={(ticketVotes) =>
                  setPosts((currentPosts) =>
                    currentPosts.map((post) =>
                      post.id === displayedPost.id
                        ? {
                            ...post,
                            meta: {
                              ...(post.meta ?? {}),
                              ticketVotes: String(ticketVotes),
                            },
                          }
                        : post,
                    ),
                  )
                }
                postId={displayedPost.id}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setExpandedPostId("");
                if (hashPost) {
                  setHashPostId("");
                  if (browseMode === "category" && selectedDailyFoodCategory) setIsCategoriesOpen(true);
                  window.history.replaceState(
                    null,
                    "",
                    `${window.location.pathname}${window.location.search}`,
                  );
                }
                if (matchedReferencePost) {
                  onClearReference();
                }
              }}
              className={`${styles.currentEventsAction} border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]`}
            >
              {isPeriodView ? "back to map" : "back"}
            </button>
            {!displayedPost.incognito &&
            (shouldClassifyAuthor(displayedPost) ||
              getAuthorName(displayedPost)) ? (
              <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                {canShowAuthor(displayedPost) ? (
                  <Link
                    href={`/profile/${displayedPost.author}`}
                    className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                  >
                    {getAuthorDisplayName(displayedPost)}
                    <BayRankBadge rank={members.find((member) => member.member === displayedPost.author)?.rank} />
                  </Link>
                ) : canShowBayoPlusAnonProfile(displayedPost) ? (
                  <Link
                    href={`/profile/${displayedPost.author}`}
                    className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                  >
                    anon
                  </Link>
                ) : canBayoOpenClassifiedAuthor(displayedPost) ? (
                  <Link
                    href={`/profile/${displayedPost.author}`}
                    className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                  >
                    classified
                  </Link>
                ) : (
                  "classified"
                )}
              </p>
            ) : null}
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
              {getDailyFoodCategoryLabel(displayedPost)}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
              {formatTimestamp(displayedPost.createdAt)}
            </p>
            <h2 ref={articleHeading} tabIndex={isPeriodView ? -1 : undefined} className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-[#72c16a] sm:text-3xl">
              {displayedPost.title}
            </h2>
            {getDailyFoodTags(displayedPost).length ? (
              <div className="mt-4 grid gap-3 text-base leading-7 text-[#d7ffd0]">
                {getDailyFoodTags(displayedPost).map((tag, index) => (
                  <div
                    key={`${tag.text}-${tag.source}-${index}`}
                    className="flex items-start gap-3"
                  >
                    {!tag.text.startsWith(currentEventsAntithesisPrefix) &&
                    !tag.text.startsWith(currentEventsBlackLightPrefix) ? (
                      <span
                        className={`${styles.currentEventBullet} mt-2 h-2 w-2 shrink-0`}
                        aria-hidden="true"
                      />
                    ) : null}
                    <p className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                      <span>{tag.text}</span>
                      {tag.source ? (
                        <>
                          {" "}
                          <a
                            href={getSourceHref(tag.source)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-xs font-black text-[#39ff14] transition duration-150 hover:scale-125 hover:text-[#d7ffd0] hover:[text-shadow:0_0_8px_#39ff14,0_0_18px_rgba(57,255,20,0.72)]"
                            aria-label={`Source for ${tag.text}`}
                          >
                            (.)
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-[#d7ffd0]">
                no facts tags filed
              </p>
            )}
            {getPostSources(displayedPost).length ? (
              <section className="mt-5 border-t border-[#1d7f12] pt-3">
                <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
                  SOURCES
                </h3>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-5">
                  {getPostSources(displayedPost).map((source) => (
                    <li key={source}>
                      <a
                        href={getSourceHref(source)}
                        className="break-all text-[#d7ffd0] underline decoration-[#39ff14] underline-offset-4"
                      >
                        {source}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {getPostTopicTags(displayedPost).length ? (
              <section className="mt-5 border-t border-[#1d7f12] pt-3">
                <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
                  TAGS
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {getPostTopicTags(displayedPost).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => openTopicTag(tag)}
                      className="border border-[#1d7f12] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <CopyPostLinkButton path={getPostLinkPath(displayedPost)} />
              <BlackLightLink articlePath={getPostLinkPath(displayedPost)} />
              {getMetaString(displayedPost, "dailyFoodCode") ? (
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                  {getMetaString(displayedPost, "dailyFoodCode")}
                </span>
              ) : null}
            </div>
            <ArticleReadLight read={Boolean(readerId && readVisit?.postId === displayedPost.id && readVisit.readBy === readerId)} />
            <PostEngagementPanel
              key={displayedPost.id}
              isLoggedIn={isLoggedIn}
              onTruthSummaryChange={(summary) =>
                syncPostTruthSummary(displayedPost.id, summary)
              }
              postCategory={displayedPost.category}
              postId={displayedPost.id}
            />
          </article>
        ) : activePosts.length ? (
          <div className="grid gap-3">
            {selectedTopicTag ? (
              <div className="flex flex-wrap items-center gap-3 border border-[#1d7f12] px-3 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                  TAG RESULTS : {selectedTopicTag}
                </p>
                <button
                  type="button"
                  onClick={clearTopicTag}
                  className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  clear tag
                </button>
              </div>
            ) : null}
            {isReferenceMode ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPostId("");
                    setRevealAll(true);
                    onClearReference();
                  }}
                  className={`${styles.currentEventsAction} border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition`}
                >
                  exit code
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => scrollList(-1)}
              className={`${styles.currentEventsArrow} w-fit border px-3 py-1 text-sm font-black leading-none transition`}
              aria-label="Scroll Current Events posts up"
            >
              ^
            </button>
            <div ref={listRef} className="grid max-h-80 gap-5 overflow-y-auto pr-2">
              {activePosts.map((post) => {
                const postMarker = getPostMarker(post);

                return (
                <div
                  key={post.id}
                  className={`${styles.currentEventCard} daily-food-card group relative border px-4 pb-4 pt-8 transition duration-150`}
                >
                  {postMarker ? (
                    <span className="absolute right-3 top-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#39ff14]/70">
                      {postMarker}
                    </span>
                  ) : null}
                  <button
                    id={`post-${post.id}`}
                    type="button"
                    onClick={() =>
                      setExpandedPostId((currentId) =>
                        currentId === post.id ? "" : post.id,
                      )
                    }
                    className={`${styles.currentEventArticleButton} block w-full origin-left text-left transition duration-150 group-hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]`}
                  >
                    <span
                      style={{ color: "#72c16a" }}
                      className={`daily-food-headline-redacted relative block w-full overflow-hidden text-left text-base font-black uppercase leading-6 tracking-[0.08em] transition sm:text-xl sm:leading-7 ${
                        isPostRevealed(post)
                          ? "daily-food-headline-revealed"
                          : ""
                      }`}
                    >
                      <span className="block whitespace-normal break-words text-left">
                        {post.title}
                      </span>
                    </span>
                    <span
                      className={`daily-food-date-redacted relative mt-2 block w-fit overflow-hidden pr-8 text-left text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78] ${
                        isPostRevealed(post)
                          ? "daily-food-headline-revealed"
                          : ""
                      }`}
                    >
                      <span>{formatTimestamp(post.createdAt)}</span>
                    </span>
                  </button>
                </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollList(1)}
              className={`${styles.currentEventsArrow} w-fit border px-3 py-1 text-sm font-black leading-none transition`}
              aria-label="Scroll Current Events posts down"
            >
              ⌄
            </button>
          </div>
        ) : selectedTopicTag ? (
          <div className="grid gap-4">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              no current events posts match {selectedTopicTag}
            </p>
            <button
              type="button"
              onClick={clearTopicTag}
              className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
            >
              clear tag
            </button>
          </div>
        ) : isReferenceMode ? (
          <div className="grid gap-4">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              search channel empty
            </p>
            <button
              type="button"
              onClick={() => {
                setExpandedPostId("");
                setRevealAll(true);
                onClearReference();
              }}
              className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
            >
              exit code
            </button>
          </div>
        ) : (
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
            current events queue clear
          </p>
        )}
      </div>
      ) : null}
    </div>
  );
}
