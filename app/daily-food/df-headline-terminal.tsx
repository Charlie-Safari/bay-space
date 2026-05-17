"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CodeAccessDock from "../components/code-access-dock";
import CopyPostLinkButton from "../components/copy-post-link-button";
import FavoriteButton from "../components/favorite-button";
import DosCodeBox from "../components/dos-code-box";
import {
  BayPost,
  getBayPostsByCategory,
  getDateKey,
  postStoreEvent,
} from "../components/post-store";
import {
  favoriteStoreEvent,
  getFavoriteAuthorIds,
  getFavoritePostIds,
} from "../components/favorite-store";
import { hasCreatorAccess, isGhostRole } from "../../lib/bay-space-roles";

type AuthorFilter = "all" | "favorite-authors" | "ghosts" | "creators" | "anon";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatTimelineDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
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
  member: string;
  name?: string;
  refName: string;
  roles?: string;
};

function getMetaString(post: BayPost, key: string) {
  const value = post.meta?.[key];

  return typeof value === "string" ? value : "";
}

type DfHeadlineTerminalProps = {
  onClearReference: () => void;
  unlockedReference: string;
};

function getPostHashId() {
  if (typeof window === "undefined") {
    return "";
  }

  const postId = window.location.hash.replace(/^#post-/, "");

  return postId === window.location.hash ? "" : postId;
}

export default function DfHeadlineTerminal({
  onClearReference,
  unlockedReference,
}: DfHeadlineTerminalProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeDate, setActiveDate] = useState(today);
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoritePostIds, setFavoritePostIds] = useState<string[]>([]);
  const [favoriteAuthorIds, setFavoriteAuthorIds] = useState<string[]>([]);
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all");
  const [expandedPostId, setExpandedPostId] = useState("");
  const [hashPostId, setHashPostId] = useState(getPostHashId);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const canMoveForward = activeDate < today;
  const activeDateKey = getDateKey(activeDate);
  const normalizedReferenceQuery = unlockedReference
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const matchedReferencePost = normalizedReferenceQuery
    ? posts.find(
        (post) =>
          post.incognito &&
          post.shelfCode?.toLowerCase() === normalizedReferenceQuery,
      ) ?? null
    : null;
  const matchedReferenceMember = normalizedReferenceQuery
    ? members.find(
        (savedMember) =>
          savedMember.refName?.toLowerCase().replace(/[^a-z0-9]/g, "") ===
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
  const nextTimelineDate = addDays(activeDate, 1);
  const previousTimelineDate = addDays(activeDate, -1);

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("daily-food").then(setPosts);
    }

    async function syncLogin() {
      const response = await fetch("/api/me", { cache: "no-store" });
      setIsLoggedIn(response.ok);
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
      setFavoriteAuthorIds(await getFavoriteAuthorIds());
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
    function syncPostHash() {
      setHashPostId(getPostHashId());
    }

    window.addEventListener("hashchange", syncPostHash);

    return () => {
      window.removeEventListener("hashchange", syncPostHash);
    };
  }, []);

  function moveDate(days: number) {
    setActiveDate((currentDate) => {
      const nextDate = addDays(currentDate, days);

      return nextDate > today ? today : nextDate;
    });
    setExpandedPostId("");
  }

  function getVisiblePosts() {
    const sortNewestFirst = (leftPost: BayPost, rightPost: BayPost) =>
      new Date(rightPost.createdAt).getTime() -
      new Date(leftPost.createdAt).getTime();

    if (!isReferenceMode) {
      return filterPostsByAuthorMode(posts)
        .filter((post) => post.dateKey === activeDateKey && !post.incognito)
        .sort(sortNewestFirst);
    }

    if (matchedReferencePost) {
      return filterPostsByAuthorMode([matchedReferencePost]);
    }

    if (!matchedReferenceMember) {
      return [];
    }

    return filterPostsByAuthorMode(posts)
      .filter(
        (post) =>
          post.incognito &&
          post.author === matchedReferenceMember.member &&
          post.dateKey === activeDateKey,
      )
      .sort(sortNewestFirst);
  }

  function filterPostsByAuthorMode(filteredPosts: BayPost[]) {
    if (authorFilter === "all") {
      return filteredPosts;
    }

    return filteredPosts.filter((post) => {
      const authorRoles = getAuthorRoles(post);

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

  function getPostSources(post: BayPost) {
    const tagSources = post.meta?.tagSources;
    const sources = Array.isArray(tagSources) ? tagSources : post.meta?.sources;

    return Array.isArray(sources) ? sources.filter(Boolean) : [];
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

  function shouldClassifyAuthor(post: BayPost) {
    return (
      post.anonymous ||
      (isGhostRole(getAuthorRoles(post)) && !favoritePostIds.includes(post.id))
    );
  }

  function canShowAuthor(post: BayPost) {
    return !post.incognito && !shouldClassifyAuthor(post) && getAuthorName(post);
  }

  function getPostLinkPath(post: BayPost) {
    return post.incognito ? "/daily-food" : `/daily-food#post-${post.id}`;
  }

  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_130px] lg:items-start">
      <label className="grid w-fit justify-self-end gap-2 lg:col-span-2">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          sort posts by
        </span>
        <select
          value={authorFilter}
          onChange={(event) => setAuthorFilter(event.target.value as AuthorFilter)}
          className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
        >
          <option value="all">All</option>
          <option value="favorite-authors">Favorite authors</option>
          <option value="ghosts">Ghosts</option>
          <option value="creators">Creator/Influencer</option>
          <option value="anon">Anon</option>
        </select>
      </label>
      <div className="min-h-40 w-full border-2 border-[#1d7f12] bg-black px-5 py-8 shadow-[0_0_20px_rgba(57,255,20,0.14)]">
        {displayedPost ? (
          <article className="relative border-2 border-[#39ff14] bg-[#020402] px-5 py-5 shadow-[0_0_18px_rgba(57,255,20,0.2)]">
            {getPostMarker(displayedPost) ? (
              <span className="absolute right-4 top-3 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                {getPostMarker(displayedPost)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setExpandedPostId("");
                if (hashPost) {
                  setHashPostId("");
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
              className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              back
            </button>
            <div className="absolute bottom-4 right-4">
              <FavoriteButton postId={displayedPost.id} />
            </div>
            {!displayedPost.incognito &&
            (shouldClassifyAuthor(displayedPost) ||
              getAuthorName(displayedPost)) ? (
              <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                {canShowAuthor(displayedPost) ? (
                  <Link
                    href={`/profile/${displayedPost.author}`}
                    className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                  >
                    {getAuthorName(displayedPost)}
                  </Link>
                ) : (
                  "classified"
                )}
              </p>
            ) : null}
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
              {formatTimestamp(displayedPost.createdAt)}
            </p>
            {getMetaString(displayedPost, "dailyFoodCode") ? (
              <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                {getMetaString(displayedPost, "dailyFoodCode")}
              </p>
            ) : null}
            <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
              {displayedPost.title}
            </h2>
            {getDailyFoodTags(displayedPost).length ? (
              <div className="mt-4 grid gap-3 text-base leading-7 text-[#d7ffd0]">
                {getDailyFoodTags(displayedPost).map((tag, index) => (
                  <div
                    key={`${tag.text}-${tag.source}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="mt-2 h-2 w-2 shrink-0 bg-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.75)]"
                      aria-hidden="true"
                    />
                    <p>
                      <span>{tag.text}</span>
                      {tag.source ? (
                        <>
                          {" "}
                          <a
                            href={getSourceHref(tag.source)}
                            className="inline-block text-xs font-black text-[#39ff14] transition hover:animate-[option-shake_180ms_linear] hover:text-[#d7ffd0]"
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
                no daily food tags filed
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
            <div className="mt-5">
              <CopyPostLinkButton path={getPostLinkPath(displayedPost)} />
            </div>
          </article>
        ) : activePosts.length ? (
          <div className="grid gap-3">
            {isLoggedIn || isReferenceMode ? (
              <div className="flex flex-wrap gap-2">
                {isLoggedIn || isReferenceMemberMode ? (
                  <label className="flex w-fit items-center gap-3 border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    <span>reveal posts</span>
                    <input
                      type="checkbox"
                      checked={revealAll}
                      onChange={(event) => setRevealAll(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="relative h-5 w-10 rounded-full border border-[#1d7f12] bg-[#001100] transition peer-checked:border-[#39ff14] peer-checked:bg-[#39ff14] after:absolute after:left-1 after:top-1/2 after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-[#39ff14] after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-black" />
                  </label>
                ) : null}
                {isReferenceMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedPostId("");
                      setRevealAll(false);
                      onClearReference();
                    }}
                    className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                  >
                    exit code
                  </button>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => scrollList(-1)}
              className="w-fit border-2 border-[#1d7f12] px-3 py-1 text-sm font-black leading-none text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
              aria-label="Scroll Daily Food posts up"
            >
              ^
            </button>
            <div ref={listRef} className="grid max-h-80 gap-5 overflow-y-auto pr-2">
              {activePosts.map((post) => {
                const postMarker = getPostMarker(post);

                return (
                <div
                  key={post.id}
                  className="daily-food-card group relative border border-dashed border-[#1d7f12]/85 px-4 pb-4 pt-8 transition duration-150 hover:border-[#39ff14]/80"
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
                    className="block w-full origin-left text-left transition duration-150 group-hover:scale-[1.015] group-hover:bg-[#031403] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    <span
                      className={`daily-food-headline-redacted relative block w-full overflow-hidden text-right text-xl font-black uppercase tracking-[0.12em] transition ${
                        isPostRevealed(post)
                          ? "daily-food-headline-revealed"
                          : ""
                      }`}
                    >
                      <span className="daily-food-headline-scroll">
                        <span className="daily-food-headline-static">
                          {post.title}
                        </span>
                        <span
                          className="daily-food-headline-marquee"
                          aria-hidden="true"
                        >
                          <span className="daily-food-headline-track">
                            {post.title}
                          </span>
                        </span>
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
              className="w-fit border-2 border-[#1d7f12] px-3 py-1 text-sm font-black leading-none text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
              aria-label="Scroll Daily Food posts down"
            >
              ⌄
            </button>
          </div>
        ) : isReferenceMode ? (
          <div className="grid gap-4">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              code channel empty
            </p>
            <button
              type="button"
              onClick={() => {
                setExpandedPostId("");
                setRevealAll(false);
                onClearReference();
              }}
              className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
            >
              exit code
            </button>
          </div>
        ) : (
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
            daily food queue clear
          </p>
        )}
      </div>

      <aside
        aria-label="Daily Food timeline"
        className="justify-self-start lg:justify-self-end"
      >
        <div className="flex w-28 flex-col items-center gap-3 text-[#39ff14]">
          {canMoveForward ? (
            <button
              type="button"
              onClick={() => moveDate(1)}
              className="border-2 border-[#1d7f12] px-3 py-1 text-sm font-black leading-none transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
              aria-label="Move timeline forward one day"
            >
              ^
            </button>
          ) : null}
          <div className="flex h-24 flex-col items-center justify-center gap-3">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7f9f78]">
              {nextTimelineDate <= today
                ? formatTimelineDate(nextTimelineDate)
                : "current"}
            </span>
            <span className="h-12 w-px bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
          </div>
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              {formatMonth(activeDate)}
            </div>
            <div className="mt-1 text-5xl font-black leading-none [text-shadow:0_0_14px_#39ff14]">
              {activeDate.getDate()}
            </div>
          </div>
          <div className="flex h-24 flex-col items-center justify-center gap-3">
            <span className="h-12 w-px bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
            <span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7f9f78]">
              {formatTimelineDate(previousTimelineDate)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => moveDate(-1)}
            className="border-2 border-[#1d7f12] px-3 py-1 text-sm font-black leading-none transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
            aria-label="Move timeline back one day"
          >
            ⌄
          </button>
        </div>
      </aside>

      <CodeAccessDock>
        {(mode) => (
          <DosCodeBox
            ariaLabel={`Activate ${mode} Daily Food code`}
            autoFocus
            id={`daily-food-${mode}-code`}
            label={mode === "rc" ? "RC code" : "classified code"}
            maxLength={7}
            onSubmitCode={() => undefined}
          />
        )}
      </CodeAccessDock>
    </div>
  );
}
