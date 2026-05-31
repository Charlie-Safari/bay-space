"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BayPost,
  getBayPostsByCategory,
  postStoreEvent,
} from "../components/post-store";
import CopyPostLinkButton from "../components/copy-post-link-button";
import FavoriteButton from "../components/favorite-button";
import {
  countFavoritePosts,
  favoriteStoreEvent,
  getFavoriteAuthorIds,
} from "../components/favorite-store";
import { recordPostVisit } from "../components/post-visit-client";
import {
  hasCreatorAccess,
  isBayoClub,
  isGhostRole,
} from "../../lib/bay-space-roles";
import {
  formatPointTenths,
  getBaySpacePostPointTenths,
} from "../../lib/bay-space-scoring";
import { theoryCategories } from "../../lib/theory-categories";

type SortMode = "az" | "date";
type AuthorFilter = "all" | "favorite-authors" | "ghosts" | "creators" | "anon";

type SavedMember = {
  member: string;
  name: string;
  roles?: string;
};

function getPostHashId() {
  if (typeof window === "undefined") {
    return "";
  }

  const postId = window.location.hash.replace(/^#post-/, "");

  return postId === window.location.hash ? "" : postId;
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

export default function TheoryBoard() {
  const hasSetLoggedInRevealDefault = useRef(false);
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
  const [activeMember, setActiveMember] = useState<SavedMember | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [selectedTheoryCategory, setSelectedTheoryCategory] = useState("");

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

      if (member && !hasSetLoggedInRevealDefault.current) {
        setRevealAll(true);
        hasSetLoggedInRevealDefault.current = true;
      }

      if (!member) {
        setRevealAll(false);
        hasSetLoggedInRevealDefault.current = false;
      }
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

      if (postId) {
        setOpenPostId(postId);
      }
    }

    window.addEventListener("hashchange", syncPostHash);

    return () => {
      window.removeEventListener("hashchange", syncPostHash);
    };
  }, []);

  useEffect(() => {
    if (!openPostId) {
      return;
    }

    let isMounted = true;

    recordPostVisit(openPostId)
      .then((postVisits) => {
        if (!isMounted || typeof postVisits !== "number") {
          return;
        }

        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post.id === openPostId
              ? {
                  ...post,
                  meta: {
                    ...(post.meta ?? {}),
                    postVisits: String(postVisits),
                  },
                }
              : post,
          ),
        );
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [openPostId]);

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

  function closePost() {
    setOpenPostId("");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  function isPostRevealed() {
    return isLoggedIn && revealAll;
  }

  const sortedPosts = useMemo(() => {
    const searchWords = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const authorFilteredPosts =
      authorFilter === "all"
        ? posts
        : posts.filter((post) => {
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
          const searchableText = `${post.title} ${post.body}`.toLowerCase();

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
  }, [authorFilter, favoriteAuthorIds, members, posts, query, sortMode]);

  return (
    <div className="mt-10 grid max-w-4xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCategoriesOpen((isOpen) => {
                if (isOpen) {
                  setSelectedTheoryCategory("");
                }

                return !isOpen;
              });
            }}
            className={`border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
              isCategoriesOpen
                ? "border-[#39ff14] bg-[#39ff14] text-black shadow-[0_0_16px_rgba(57,255,20,0.5)]"
                : "border-[#1d7f12] bg-black text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
            }`}
          >
            Categories
          </button>
          <label className="grid w-fit gap-2">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              organize by
            </span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
            >
              <option value="az">A-Z</option>
              <option value="date">Date</option>
            </select>
          </label>
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex w-fit flex-wrap items-center gap-3 border-2 border-[#1d7f12] bg-black px-3 py-2 shadow-[0_0_14px_rgba(57,255,20,0.14)]"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="search"
              className="w-52 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.14em] text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
              aria-label="Search Theories"
            />
            <button
              type="submit"
              className="grid h-10 w-10 place-items-center border border-[#39ff14] text-xl leading-none text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              aria-label="Search Theories"
            >
              🌀
            </button>
          </form>
          {isLoggedIn ? (
            <label className="grid w-fit gap-2">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
                reveal
              </span>
              <span className="flex h-[38px] w-fit items-center gap-3 border border-[#1d7f12] px-3 text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                <input
                  type="checkbox"
                  checked={revealAll}
                  onChange={(event) => setRevealAll(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-5 w-10 rounded-full border border-[#1d7f12] bg-[#001100] transition peer-checked:border-[#39ff14] peer-checked:bg-[#39ff14] after:absolute after:left-1 after:top-1/2 after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-[#39ff14] after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-black" />
                <span>{revealAll ? "on" : "off"}</span>
              </span>
            </label>
          ) : null}
        </div>
        <label className="grid w-fit gap-2 sm:justify-self-end">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
            sort posts by
          </span>
          <select
            value={authorFilter}
            onChange={(event) =>
              setAuthorFilter(event.target.value as AuthorFilter)
            }
            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
          >
            <option value="all">All</option>
            <option value="favorite-authors">Favorite authors</option>
            <option value="ghosts">Authors</option>
            <option value="creators">Influencers</option>
            <option value="anon">Anon</option>
          </select>
        </label>
      </div>

      {isCategoriesOpen ? (
        <section className="daily-food-categories-overlay relative overflow-hidden border-2 border-[#39ff14] bg-black/95 px-5 py-6 shadow-[0_0_20px_rgba(57,255,20,0.14)]">
          <div className="daily-food-categories-grid" aria-hidden="true" />
          <div className="relative z-10 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d7ffd0]">
                {selectedTheoryCategory || "Categories"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCategoriesOpen(false);
                  setSelectedTheoryCategory("");
                }}
                className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              >
                close
              </button>
            </div>

            {selectedTheoryCategory ? (
              <div className="grid gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedTheoryCategory("")}
                  className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  back
                </button>
                {theoryCategories
                  .filter((category) => category.label === selectedTheoryCategory)
                  .map((category) => (
                    <article
                      key={category.label}
                      className="border border-[#39ff14]/60 bg-black/80 px-4 py-5 text-[#d7ffd0] shadow-[0_0_14px_rgba(57,255,20,0.14)]"
                    >
                      <h2 className="text-lg font-black uppercase tracking-[0.16em] text-[#39ff14]">
                        {category.label}
                      </h2>
                      <p className="mt-3 text-sm font-bold leading-6 tracking-[0.03em]">
                        {category.description}
                      </p>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {theoryCategories.map((category) => (
                  <button
                    key={category.label}
                    type="button"
                    onClick={() => setSelectedTheoryCategory(category.label)}
                    className="daily-food-category-button border border-[#39ff14]/50 bg-black/75 px-4 py-4 text-left text-[#d7ffd0] shadow-[0_0_10px_rgba(57,255,20,0.12)] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_18px_rgba(57,255,20,0.5)] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    <span className="block text-sm font-black uppercase tracking-[0.14em]">
                      {category.label}
                    </span>
                    <span className="mt-2 block text-xs font-bold normal-case leading-5 tracking-[0.02em]">
                      {category.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {sortedPosts.length ? (
        <div className="grid gap-3">
          {sortedPosts.map((post) => {
            const postScore = formatPointTenths(
              getBaySpacePostPointTenths(post, favoritePostCounts),
            );

            return (
            <article
              key={post.id}
              id={`post-${post.id}`}
              className={`theory-card relative bg-black px-4 py-4 ${
                openPostId === post.id
                  ? "border-2 border-[#39ff14] bg-[#020402] shadow-[0_0_18px_rgba(57,255,20,0.2)]"
                  : "border-2 border-[#1d7f12]"
              }`}
            >
              {openPostId === post.id ? (
                <>
                  <div className="absolute right-4 top-3 flex items-center gap-3">
                    <p className="text-right text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
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
                    className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    back
                  </button>
                  {!post.anonymous && getAuthorName(post) ? (
                    <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      <Link
                        href={`/profile/${post.author}`}
                        className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                      >
                        {getAuthorDisplayName(post)}
                      </Link>
                    </p>
                  ) : post.anonymous ? (
                    <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      {canBayoOpenClassifiedAuthor(post) ? (
                        <Link
                          href={`/profile/${post.author}`}
                          className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                        >
                          classified
                        </Link>
                      ) : (
                        "classified"
                      )}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                    {formatPostTimestamp(post.createdAt)}
                  </p>
                  <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
                    {post.title}
                  </h2>
                  <p className="mt-4 whitespace-pre-wrap font-mono text-base leading-7 text-[#39ff14]">
                    {post.body || "no theory filed"}
                  </p>
                  {getPostSources(post).length ? (
                    <section className="mt-5 border-t border-[#1d7f12] pt-3">
                      <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
                        SOURCES
                      </h3>
                      <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-5">
                        {getPostSources(post).map((source) => (
                          <li key={source}>
                            <a
                              href={getSourceHref(source)}
                              target="_blank"
                              rel="noopener noreferrer"
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
                    <CopyPostLinkButton path={`/theories#post-${post.id}`} />
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setOpenPostId((currentId) =>
                      currentId === post.id ? "" : post.id,
                    )
                  }
                  className="block w-full text-right focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  <span
                    className={`theory-title-redacted relative block w-full overflow-hidden text-lg font-black uppercase tracking-[0.12em] text-[#39ff14] ${
                      isPostRevealed() ? "theory-strip-revealed" : ""
                    }`}
                  >
                    <span>{post.title}</span>
                  </span>
                  <span
                    className={`theory-date-redacted relative mt-2 block w-full overflow-hidden text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78] ${
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
      ) : (
        <div className="border-2 border-[#1d7f12] bg-black px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
          theory board awaiting submissions
        </div>
      )}
    </div>
  );
}
