"use client";

import BayRankBadge from "../components/bay-rank-badge";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BayPost,
  getBayPostsByCategory,
  postStoreEvent,
} from "../components/post-store";
import CopyPostLinkButton from "../components/copy-post-link-button";
import BlackLightLink from "../components/black-light-link";
import FavoriteButton from "../components/favorite-button";
import PostEngagementPanel from "../components/post-engagement-panel";
import {
  countFavoritePosts,
  favoriteStoreEvent,
  getFavoriteAuthorIds,
} from "../components/favorite-store";
import type { BayPostTruthVoteSummary } from "../../lib/bay-space-types";
import { recordArticleVisit } from "../components/post-visit-client";
import ArticleReadLight from "../components/article-read-light";
import {
  hasCreatorAccess,
  isBayoClub,
  isGhostRole,
} from "../../lib/bay-space-roles";
import {
  formatPointTenths,
  getBaySpacePostPointTenths,
  getPostVisitCount,
} from "../../lib/bay-space-scoring";
import {
  doesTheoryCategoryMatch,
  isKnowSomethingPost,
  knowSomethingArchiveHref,
  knowSomethingCategory,
  theoryIcebergCategories,
} from "../../lib/theory-categories";
import {
  doPostTopicTagsIncludeTag,
  getPostTopicTags,
  getPostTopicTagSearchText,
} from "../../lib/bay-space-tags";
import { getPacificDateKey } from "../../lib/pacific-date";
import MonthlyIcebergMap from "./monthly-iceberg-map";
import { getMonthlyIcebergSignals } from "./monthly-iceberg-layout";
import styles from "./theory-experience.module.css";

type SortMode = "az" | "date";
type AuthorFilter = "all" | "favorite-authors" | "ghosts" | "creators" | "anon";
type BrowseMode = "" | "all" | "category" | "circles" | "month";

type SavedMember = {
  rank?: string;
  member: string;
  name: string;
  roles?: string;
};

const minimumBadgeViewCount = 10;
const minimumGreenCheckVoteCount = 3;
const onFireViewThreshold = 100;
const conversationCommentThreshold = 10;
const conversationAuthorThreshold = 3;
const icebergLevelWidths = [28, 56, 64, 63, 60, 57, 54, 51, 48, 44, 39, 35];

function getPostTruthAverage(post: BayPost) {
  const average = Number(post.meta?.truthAverageScore);

  return Number.isFinite(average) && average > 0 ? average : 0;
}

function getPostTruthVoteCount(post: BayPost) {
  const count = Number(post.meta?.truthVoteCount);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function getPostCommentCount(post: BayPost) {
  const count = Number(post.meta?.commentCount);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function getPostCommentAuthorCount(post: BayPost) {
  const count = Number(post.meta?.commentAuthorCount);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function hasGreenCheck(post: BayPost) {
  return (
    getPostVisitCount(post) >= minimumBadgeViewCount &&
    getPostTruthVoteCount(post) >= minimumGreenCheckVoteCount &&
    getPostTruthAverage(post) >= 8
  );
}

function isPostOnFire(post: BayPost) {
  return getPostVisitCount(post) >= onFireViewThreshold;
}

function hasConversationBadge(post: BayPost) {
  return (
    getPostVisitCount(post) >= minimumBadgeViewCount &&
    getPostCommentCount(post) >= conversationCommentThreshold &&
    getPostCommentAuthorCount(post) >= conversationAuthorThreshold
  );
}

function claimGuestTheoryVisit(postId: string) {
  const storageKey = `bay-space-qualified-theory-view:${postId}`;

  try {
    if (window.localStorage.getItem(storageKey)) {
      return null;
    }

    window.localStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // The public visit can still be counted when browser storage is unavailable.
  }

  return storageKey;
}

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

function getPostSources(post: BayPost) {
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

function isCryptiPost(post: BayPost) {
  return post.meta?.cryptiPost === "true";
}

function formatPostTimestamp(createdAt: string) {
  return new Date(createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TheoryBoard({ showKnowSomething = false }: { showKnowSomething?: boolean }) {
  const screenHeading = useRef<HTMLHeadingElement>(null);
  const [browseMode, setBrowseMode] = useState<BrowseMode>(() =>
    showKnowSomething ? "category" : getPostHashId() || getTopicTagParam() ? "all" : "",
  );
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [query, setQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all");
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoriteAuthorIds, setFavoriteAuthorIds] = useState<string[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});
  const [openPostId, setOpenPostId] = useState(getPostHashId);
  const [selectedTopicTag, setSelectedTopicTag] = useState(getTopicTagParam);
  const [activeMember, setActiveMember] = useState<SavedMember | null>();
  const readerId = activeMember === undefined ? undefined : activeMember?.member ?? null;
  const [readVisit, setReadVisit] = useState<{ postId: string; readBy: string | null }>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [revealAll, setRevealAll] = useState(true);
  const [selectedTheoryCategory, setSelectedTheoryCategory] = useState(showKnowSomething ? knowSomethingCategory : "");

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("theory").then((savedPosts) => {
        setPosts(
          savedPosts.filter((post) => !post.incognito && !isCryptiPost(post)),
        );
      });
    }

    syncPosts();
    async function syncLogin() {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = response.ok
        ? ((await response.json()) as { member?: SavedMember | null })
        : { member: null };
      const member = data.member ?? null;

      setActiveMember(member);
      setIsLoggedIn(Boolean(member));
    }

    async function syncFavorites() {
      setFavoriteAuthorIds(await getFavoriteAuthorIds());
    }

    syncLogin();
    syncFavorites();
    fetch("/api/members", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { members: [] }))
      .then((data: { members?: SavedMember[] }) => {
        setMembers(data.members ?? []);
      });
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
      const postId = getPostHashId();
      const topicTag = getTopicTagParam();

      setSelectedTopicTag(topicTag);

      if (postId) {
        const isDropBox = new URLSearchParams(window.location.search).get("section") === "know-something";
        setBrowseMode(isDropBox ? "category" : "all");
        if (isDropBox) setSelectedTheoryCategory(knowSomethingCategory);
        setOpenPostId(postId);
      }
    }

    window.addEventListener("hashchange", syncPostHash);

    return () => {
      window.removeEventListener("hashchange", syncPostHash);
    };
  }, []);

  useEffect(() => {
    if (!openPostId || readerId === undefined) {
      return;
    }

    let isMounted = true;

    const guestVisitKey = readerId === null ? claimGuestTheoryVisit(openPostId) : null;
    recordArticleVisit(openPostId, { readerId, countGuestVisit: Boolean(guestVisitKey) })
      .then((visit) => {
        if (!visit && guestVisitKey) {
          try {
            window.localStorage.removeItem(guestVisitKey);
          } catch {
            // The next visit can still be counted when storage is unavailable.
          }
        }

        if (!isMounted || !visit) return;

        setReadVisit({ postId: openPostId, readBy: visit.readBy });
        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post.id === openPostId
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
  }, [openPostId, readerId]);

  useEffect(() => {
    if (!openPostId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`post-${openPostId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [openPostId, posts]);

  function getAuthorName(post: BayPost) {
    return members.find((member) => member.member === post.author)?.name.trim() ?? "";
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

  function canBayoOpenClassifiedAuthor(post: BayPost) {
    return (
      post.anonymous &&
      post.author !== "unknown" &&
      isBayoClub(activeMember?.roles ?? "")
    );
  }

  function canShowBayoPlusAnonProfile(post: BayPost) {
    return post.anonymous && post.author !== "unknown" && isBayoClub(getAuthorRoles(post));
  }

  function closePost() {
    setOpenPostId("");
    window.history.replaceState(
      null,
      "",
      selectedTopicTag ? getTopicTagUrl(selectedTopicTag) : getUrlWithoutTopicTag(),
    );
    if (browseMode === "month") {
      window.requestAnimationFrame(() => screenHeading.current?.focus());
    }
  }

  function openMonthlyStory(id: string) {
    setOpenPostId(id);
    window.requestAnimationFrame(() => {
      document.getElementById(`post-title-${id}`)?.focus({ preventScroll: true });
    });
  }

  function clearTopicTag() {
    setSelectedTopicTag("");
    setOpenPostId("");
    window.history.replaceState(null, "", getUrlWithoutTopicTag());
  }

  function openTopicTag(tag: string) {
    setSelectedTopicTag(tag);
    setOpenPostId("");
    setBrowseMode("all");
    setSelectedTheoryCategory("");
    setQuery("");
    setAuthorFilter("all");
    setSortMode("date");
    window.history.replaceState(null, "", getTopicTagUrl(tag));
  }

  function isPostRevealed() {
    return revealAll;
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

  const monthKey = getPacificDateKey().slice(0, 7);
  const monthlyPosts = useMemo(() => posts.filter((post) => {
    if (isKnowSomethingPost(post)) return false;
    const createdAt = new Date(post.createdAt);
    return Number.isFinite(createdAt.getTime()) && getPacificDateKey(createdAt).slice(0, 7) === monthKey;
  }), [posts, monthKey]);
  const monthlyStory = browseMode === "month" ? monthlyPosts.find((post) => post.id === openPostId) : undefined;
  const showMonthlyMap = browseMode === "month" && !monthlyStory;
  const monthlySignals = useMemo(
    () => showMonthlyMap ? getMonthlyIcebergSignals(monthlyPosts) : [],
    [monthlyPosts, showMonthlyMap],
  );

  const sortedPosts = useMemo(() => {
    if (browseMode === "month") return monthlyStory ? [monthlyStory] : [];
    if (!browseMode || (browseMode === "category" && !selectedTheoryCategory)) {
      return [];
    }

    const scopedPosts = posts.filter((post) => {
      if (selectedTopicTag && !doPostTopicTagsIncludeTag(post, selectedTopicTag)) {
        return false;
      }

      if (browseMode === "category") {
        const postCategory =
          typeof post.meta?.theoryCategory === "string"
            ? post.meta.theoryCategory
            : "";

        return doesTheoryCategoryMatch(postCategory, selectedTheoryCategory);
      }

      return !isKnowSomethingPost(post) || post.id === openPostId;
    });

    const searchWords = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const authorFilteredPosts =
      authorFilter === "all"
        ? scopedPosts
        : scopedPosts.filter((post) => {
            const authorRoles =
              members.find((member) => member.member === post.author)?.roles ??
              "";

            if (authorFilter === "favorite-authors") {
              return !post.anonymous && favoriteAuthorIds.includes(post.author);
            }

            if (authorFilter === "ghosts") {
              return isGhostRole(authorRoles);
            }

            if (authorFilter === "creators") {
              return hasCreatorAccess(authorRoles);
            }

            return post.anonymous;
          });
    const filteredPosts = searchWords.length
      ? authorFilteredPosts.filter((post) => {
          const searchableText = [
            post.title,
            post.body,
            getPostSources(post).join(" "),
            typeof post.meta?.theoryCategory === "string"
              ? post.meta.theoryCategory
              : "",
            getPostTopicTagSearchText(post),
          ]
            .join(" ")
            .toLowerCase();

          return searchWords.every((word) => searchableText.includes(word));
        })
      : authorFilteredPosts;

    return [...filteredPosts].sort((leftPost, rightPost) => {
      if (sortMode === "az") {
        return leftPost.title.localeCompare(rightPost.title);
      }

      return (
        new Date(rightPost.createdAt).getTime() -
        new Date(leftPost.createdAt).getTime()
      );
    });
  }, [
    authorFilter,
    browseMode,
    favoriteAuthorIds,
    members,
    monthlyStory,
    openPostId,
    posts,
    query,
    selectedTheoryCategory,
    selectedTopicTag,
    sortMode,
  ]);

  const monthlyAttentionTotals = useMemo(() => {
    return {
      conversations: monthlyPosts.filter(hasConversationBadge).length,
      greenChecks: monthlyPosts.filter(hasGreenCheck).length,
      newPosts: monthlyPosts.length,
      onFire: monthlyPosts.filter(isPostOnFire).length,
    };
  }, [monthlyPosts]);

  const hasActiveFeed =
    browseMode === "all" ||
    Boolean(monthlyStory) ||
    (browseMode === "category" && Boolean(selectedTheoryCategory));
  const activeFeedLabel =
    browseMode === "month"
      ? "THIS MONTH"
      : browseMode === "category"
        ? selectedTheoryCategory
        : selectedTopicTag
          ? `TAG / ${selectedTopicTag}`
          : "CONSPIRACIES";
  const isMainScreen = browseMode === "";
  const screenTitle =
    browseMode === "month"
      ? "THIS MONTH"
      : browseMode === "category"
        ? selectedTheoryCategory || "CONSPIRACY CATEGORIES"
        : browseMode === "circles"
          ? "CIRCLES"
        : "CONSPIRACY";
  const screenPath =
    browseMode === "month"
      ? "c:\\bay-space\\conspiracy\\this-month"
      : browseMode === "category"
        ? selectedTheoryCategory
          ? `c:\\bay-space\\conspiracy\\categories\\${selectedTheoryCategory
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`
          : "c:\\bay-space\\conspiracy\\categories"
        : browseMode === "circles"
          ? "c:\\bay-space\\conspiracy\\circles"
        : "c:\\bay-space\\conspiracy> main";

  function returnToMainScreen() {
    setBrowseMode("");
    setSelectedTheoryCategory("");
    setSelectedTopicTag("");
    setOpenPostId("");
    setQuery("");
    setAuthorFilter("all");
    setSortMode("date");
    window.history.replaceState(null, "", window.location.pathname);
  }

  function goBackOneScreen() {
    if (monthlyStory) {
      closePost();
      return;
    }
    if (browseMode === "category" && selectedTheoryCategory) {
      setSelectedTheoryCategory("");
      setOpenPostId("");
      setQuery("");
      setAuthorFilter("all");
      setSortMode("date");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    returnToMainScreen();
  }

  return (
    <div className={`${styles.board} grid w-full max-w-5xl gap-8`}>
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
            ← back / {monthlyStory ? "this month" : browseMode === "category" && selectedTheoryCategory
              ? "conspiracy categories"
              : "conspiracy > main"}
          </button>
        ) : null}
      </header>

      {isMainScreen ? (
        <section
          className={`${styles.entryGrid} order-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3`}
          aria-label="Choose conspiracy time range"
        >
          {[
            {
              description: "Explore this month's stories as signals in the ice.",
              label: "THIS MONTH",
              mode: "month" as const,
            },
            {
              description: "Browse every theory by subject and type.",
              label: "CATEGORIES",
              mode: "category" as const,
            },
            {
              description: "Gather around one idea and investigate together.",
              label: "CIRCLES",
              mode: "circles" as const,
            },
          ].map((option, index) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => {
                setBrowseMode(option.mode);
                setSelectedTheoryCategory("");
                setSelectedTopicTag("");
                setOpenPostId("");
                setQuery("");
                setAuthorFilter("all");
                setSortMode("date");
              }}
              className={`${styles.entryCard} ${option.mode === "month" ? styles.carnivalCard : ""} text-left focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]`}
            >
              {option.mode === "month" ? (
                <>
                  <span className={styles.carnivalLabel}>
                    <span>OPEN</span>
                    THIS MONTH
                  </span>
                  <span className={styles.monthTotals} aria-label="This month totals">
                    <span>
                      <strong>{monthlyAttentionTotals.newPosts}</strong>
                      new posts
                    </span>
                    <span>
                      <strong>{monthlyAttentionTotals.greenChecks}</strong>
                      <span aria-hidden="true">✅</span> verified
                    </span>
                    <span>
                      <strong>{monthlyAttentionTotals.onFire}</strong>
                      <span aria-hidden="true">🔥</span> on fire
                    </span>
                    <span>
                      <strong>{monthlyAttentionTotals.conversations}</strong>
                      <span aria-hidden="true">🗣️</span> talking
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.entryNumber}>
                    0{index + 1}
                  </span>
                  <span className={styles.entryLabel}>{option.label}</span>
                </>
              )}
              {option.mode !== "month" ? (
                <span className={styles.entryDescription}>
                  {option.description}
                </span>
              ) : null}
              <span className={styles.entryArrow} aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </section>
      ) : null}

      {browseMode === "circles" ? (
        <section className={`${styles.surface} order-1 px-6 py-8`}>
          <p className="bay-terminal-copy text-xs text-[#72c16a]">
            COMING SOON
          </p>
          <p className="bay-terminal-field mt-4 max-w-2xl text-sm leading-7 text-[#bfd0bc]">
            Members will be able to start community circles around a specific
            conspiracy, gather the people following it, and continue the
            investigation together.
          </p>
        </section>
      ) : null}

      {showMonthlyMap ? (
        <div className="order-1 min-w-0">
          <MonthlyIcebergMap signals={monthlySignals} onOpenStory={openMonthlyStory} />
        </div>
      ) : null}

      {hasActiveFeed && browseMode !== "month" ? (
        <div className={`${styles.controlBar} order-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid w-fit gap-2">
              <span className="bay-terminal-copy text-xs text-[#bfd0bc]">
                organize by
              </span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="bay-terminal-copy border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm text-[#72c16a] outline-none focus:ring-2 focus:ring-[#72c16a]"
              >
                <option value="az">A-Z</option>
                <option value="date">Date</option>
              </select>
            </label>
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex w-fit flex-wrap items-center gap-3 border-2 border-[#1d7f12] bg-black px-3 py-2 shadow-[0_0_14px_rgba(114,193,106,0.14)]"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="search"
              className="bay-terminal-field w-52 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm uppercase text-[#72c16a] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#72c16a]"
              aria-label="Search Conspiracy"
            />
            <button
              type="submit"
              className="grid h-10 w-10 place-items-center border border-[#72c16a] text-xl leading-none text-[#72c16a] transition hover:bg-[#72c16a] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]"
              aria-label="Search Conspiracy"
            >
              🌀
            </button>
          </form>
          <label className="grid w-fit gap-2">
            <span className="bay-terminal-copy text-xs text-[#bfd0bc]">
              declassify
            </span>
            <span className="bay-terminal-copy flex h-[38px] w-fit items-center gap-3 border border-[#1d7f12] px-3 text-xs text-[#bfd0bc]">
              <input
                type="checkbox"
                checked={revealAll}
                onChange={(event) => setRevealAll(event.target.checked)}
                className="peer sr-only"
              />
              <span className="relative h-5 w-10 rounded-full border border-[#1d7f12] bg-[#001100] transition peer-checked:border-[#72c16a] peer-checked:bg-[#72c16a] after:absolute after:left-1 after:top-1/2 after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-[#72c16a] after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-black" />
              <span>{revealAll ? "on" : "off"}</span>
            </span>
          </label>
          </div>
          <label className="grid w-fit gap-2 sm:justify-self-end">
          <span className="bay-terminal-copy text-xs text-[#bfd0bc]">
            sort posts by
          </span>
          <select
            value={authorFilter}
            onChange={(event) =>
              setAuthorFilter(event.target.value as AuthorFilter)
            }
            className="bay-terminal-copy border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm text-[#72c16a] outline-none focus:ring-2 focus:ring-[#72c16a]"
          >
            <option value="all">All</option>
            <option value="favorite-authors">Favorite authors</option>
            <option value="ghosts">Authors</option>
            <option value="creators">Influencers</option>
            <option value="anon">Anon</option>
          </select>
          </label>
        </div>
      ) : null}

      {browseMode === "category" && !selectedTheoryCategory ? (
        <section className={`${styles.icebergSurface} order-2 relative overflow-hidden py-5 sm:py-7`}>
          <div className={`${styles.icebergHeading} flex flex-wrap items-end justify-between gap-3`}>
            <div>
              <p className="bay-terminal-copy text-[0.62rem] text-[#8da989]">
                CONSPIRACY DEPTH MAP / {theoryIcebergCategories.length} LEVELS
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-[#cfe1ca] sm:text-3xl">
                Choose your depth
              </h2>
            </div>
            <p className="bay-terminal-copy max-w-[28ch] text-[0.65rem] leading-5 text-[#a4c2b5]">
              Every level opens its own signal archive.
            </p>
          </div>
          <div className={`${styles.icebergStack} mt-3`}>
            <span className={styles.waterlineLabel} aria-hidden="true">WATERLINE / 00</span>
            <span className={styles.depthScale} aria-hidden="true" />
            {theoryIcebergCategories.map((category, index) => (
              <button
                key={category.label}
                type="button"
                aria-describedby={`iceberg-category-${index + 1}`}
                onClick={() => setSelectedTheoryCategory(category.label)}
                style={
                  {
                    "--iceberg-width": `${icebergLevelWidths[index]}%`,
                  } as CSSProperties
                }
                className={`${styles.icebergLevel} ${index === 0 ? styles.icebergTip : ""}`}
              >
                <span className={styles.icebergMeta}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{category.zone}</span>
                </span>
                <span className={styles.icebergSignal} aria-hidden="true" />
                <strong className={styles.icebergCopy}>{category.label}</strong>
                <span id={`iceberg-category-${index + 1}`} className="sr-only">{category.description}</span>
                <span className={styles.icebergArrow} aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <p className={`${styles.icebergFootnote} relative z-10 mt-6 text-center`}>
            surface record above / signal distortion increases with depth
          </p>
        </section>
      ) : null}

      {hasActiveFeed ? (
      sortedPosts.length ? (
        <div className="order-1 grid gap-3">
          {selectedTopicTag ? (
            <div className="flex flex-wrap items-center gap-3 border border-[#1d7f12] px-3 py-3">
              <p className="bay-terminal-copy text-xs text-[#bfd0bc]">
                TAG RESULTS : {selectedTopicTag}
              </p>
              <button
                type="button"
                onClick={clearTopicTag}
                className="bay-terminal-copy border border-[#1d7f12] px-3 py-2 text-xs text-[#72c16a] transition hover:border-[#72c16a] hover:bg-[#72c16a] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]"
              >
                clear tag
              </button>
            </div>
          ) : null}
          {sortedPosts.map((post) => {
            const isGuestNote = isKnowSomethingPost(post);
            const articlePath = `${isGuestNote ? knowSomethingArchiveHref : "/theories"}#post-${post.id}`;
            const postScore = formatPointTenths(
              getBaySpacePostPointTenths(post, favoritePostCounts),
            );
            const showMonthlyAttention = browseMode === "month";
            const showGreenCheck = showMonthlyAttention && hasGreenCheck(post);
            const showFire = showMonthlyAttention && isPostOnFire(post);
            const showConversation =
              showMonthlyAttention && hasConversationBadge(post);

            return (
            <article
              key={post.id}
              id={`post-${post.id}`}
              className={`${styles.articleCard} theory-card relative bg-black px-4 py-4 ${
                openPostId === post.id
                ? "border-2 border-[#72c16a] bg-[#020402] shadow-[0_0_18px_rgba(114,193,106,0.2)]"
                : "border-2 border-[#1d7f12]"
              }`}
            >
              {openPostId === post.id ? (
                <>
                  <div className="absolute right-4 top-3 flex items-center gap-3">
                    {showGreenCheck || showFire || showConversation ? (
                      <span className={styles.monthBadges} aria-label="Monthly attention badges">
                        {showGreenCheck ? (
                          <span title="10+ views, 3+ ratings, and an 8.0+ truth average">✅</span>
                        ) : null}
                        {showFire ? (
                          <span title={`${onFireViewThreshold}+ qualified views this month`}>🔥</span>
                        ) : null}
                        {showConversation ? (
                          <span title="10+ comments from at least 3 members">🗣️</span>
                        ) : null}
                      </span>
                    ) : null}
                    <p className="bay-terminal-copy text-right text-xs text-[#72c16a]">
                      {postScore} pts
                    </p>
                    <FavoriteButton
                      onCountChange={(count) =>
                        setFavoritePostCounts((counts) => ({
                          ...counts,
                          [post.id]: count,
                        }))
                      }
                      postId={post.id}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={closePost}
                    className="bay-terminal-copy border border-[#1d7f12] px-3 py-2 text-xs text-[#72c16a] transition hover:border-[#72c16a] hover:bg-[#72c16a] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]"
                  >
                    {monthlyStory ? "back to map" : "back"}
                  </button>
                  {isGuestNote ? (
                    <p className="bay-terminal-copy mt-5 text-xs text-[#7f9f78]">Anonymous guest note</p>
                  ) : !post.anonymous && getAuthorName(post) ? (
                    <p className="bay-terminal-copy mt-5 text-xs text-[#7f9f78]">
                      <Link
                        href={`/profile/${post.author}`}
                        className="underline decoration-[#72c16a] underline-offset-4 transition hover:text-[#72c16a]"
                      >
                        {getAuthorDisplayName(post)}
                        <BayRankBadge rank={members.find((member) => member.member === post.author)?.rank} />
                      </Link>
                    </p>
                  ) : post.anonymous ? (
                    <p className="bay-terminal-copy mt-5 text-xs text-[#7f9f78]">
                      {canShowBayoPlusAnonProfile(post) ? (
                        <Link
                          href={`/profile/${post.author}`}
                          className="underline decoration-[#72c16a] underline-offset-4 transition hover:text-[#72c16a]"
                        >
                          anon
                        </Link>
                      ) : canBayoOpenClassifiedAuthor(post) ? (
                        <Link
                          href={`/profile/${post.author}`}
                          className="underline decoration-[#72c16a] underline-offset-4 transition hover:text-[#72c16a]"
                        >
                          classified
                        </Link>
                      ) : (
                        "classified"
                      )}
                    </p>
                  ) : null}
                  <p className="bay-terminal-copy mt-3 text-xs text-[#7f9f78]">
                    {formatPostTimestamp(post.createdAt)}
                  </p>
                  <h2
                    id={`post-title-${post.id}`}
                    tabIndex={monthlyStory ? -1 : undefined}
                    className="bay-terminal-copy mt-3 text-2xl text-[#72c16a]"
                  >
                    {post.title}
                  </h2>
                  <p className="bay-terminal-field mt-4 whitespace-pre-wrap text-base leading-7 text-[#bfd0bc] [overflow-wrap:anywhere]">
                    {post.body || "no theory filed"}
                  </p>
                  {getPostSources(post).length ? (
                    <section className="mt-5 border-t border-[#1d7f12] pt-3">
                      <h3 className="bay-terminal-copy text-xs text-[#7f9f78]">
                        SOURCES
                      </h3>
                      <ol className="bay-terminal-field mt-2 list-decimal space-y-2 pl-5 text-xs leading-5">
                        {getPostSources(post).map((source) => (
                          <li key={source}>
                            <a
                              href={getSourceHref(source)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-[#bfd0bc] underline decoration-[#72c16a] underline-offset-4"
                            >
                              {source}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ) : null}
                  {getPostTopicTags(post).length ? (
                    <section className="mt-5 border-t border-[#1d7f12] pt-3">
                      <h3 className="bay-terminal-copy text-xs text-[#7f9f78]">
                        TAGS
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getPostTopicTags(post).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => openTopicTag(tag)}
                            className="bay-terminal-copy border border-[#1d7f12] px-2 py-1 text-xs text-[#72c16a] transition hover:border-[#72c16a] hover:bg-[#72c16a] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <div className="mt-5">
                    <CopyPostLinkButton path={articlePath} />
                    <div className="mt-3"><BlackLightLink articlePath={articlePath} /></div>
                  </div>
                  <ArticleReadLight read={Boolean(readerId && readVisit?.postId === post.id && readVisit.readBy === readerId)} />
                  <PostEngagementPanel
                    isLoggedIn={isLoggedIn}
                    onCommentSaved={() => {
                      getBayPostsByCategory("theory").then((savedPosts) => {
                        setPosts(
                          savedPosts.filter(
                            (savedPost) =>
                              !savedPost.incognito && !isCryptiPost(savedPost),
                          ),
                        );
                      });
                    }}
                    onTruthSummaryChange={(summary) =>
                      syncPostTruthSummary(post.id, summary)
                    }
                    postCategory={post.category}
                    postId={post.id}
                  />
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setOpenPostId((currentId) =>
                      currentId === post.id ? "" : post.id,
                    )
                  }
                  className="block w-full text-right focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]"
                >
                  {showGreenCheck || showFire || showConversation ? (
                    <span className={`${styles.monthBadges} mb-3 justify-end`} aria-label="Monthly attention badges">
                      {showGreenCheck ? (
                        <span title="10+ views, 3+ ratings, and an 8.0+ truth average">✅</span>
                      ) : null}
                      {showFire ? (
                        <span title={`${onFireViewThreshold}+ qualified views this month`}>🔥</span>
                      ) : null}
                      {showConversation ? (
                        <span title="10+ comments from at least 3 members">🗣️</span>
                      ) : null}
                    </span>
                  ) : null}
                  <span
                    className={`bay-terminal-copy theory-title-redacted relative block w-full overflow-hidden text-lg text-[#72c16a] ${
                      isPostRevealed() ? "theory-strip-revealed" : ""
                    }`}
                  >
                    <span>{post.title}</span>
                  </span>
                  <span
                    className={`bay-terminal-copy theory-date-redacted relative mt-2 block w-full overflow-hidden text-xs text-[#7f9f78] ${
                      isPostRevealed() ? "theory-strip-revealed" : ""
                    }`}
                  >
                    <span>{formatPostTimestamp(post.createdAt)}</span>
                  </span>
                </button>
              )}
            </article>
            );
          })}
        </div>
      ) : selectedTopicTag ? (
        <div className={`${styles.emptyState} bay-terminal-copy order-1 grid gap-4 px-4 py-4 text-sm text-[#bfd0bc]`}>
          <p>no conspiracy posts match {selectedTopicTag}</p>
          <button
            type="button"
            onClick={clearTopicTag}
            className="w-fit border border-[#1d7f12] px-3 py-2 text-xs text-[#72c16a] transition hover:border-[#72c16a] hover:bg-[#72c16a] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#bfd0bc]"
          >
            clear tag
          </button>
        </div>
      ) : (
        <div className={`${styles.emptyState} bay-terminal-copy order-1 px-4 py-4 text-sm text-[#bfd0bc]`}>
          no conspiracies filed for {activeFeedLabel.toLowerCase()}
        </div>
      )) : null}
    </div>
  );
}
