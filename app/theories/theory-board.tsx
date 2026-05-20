"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BayPost,
  getBayPostsByCategory,
  postStoreEvent,
} from "../components/post-store";
import CopyPostLinkButton from "../components/copy-post-link-button";
import FavoriteButton from "../components/favorite-button";
import {
  favoriteStoreEvent,
  getActiveMemberId,
  getFavoriteAuthorIds,
} from "../components/favorite-store";
import { hasCreatorAccess, isGhostRole } from "../../lib/bay-space-roles";

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
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [query, setQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all");
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoriteAuthorIds, setFavoriteAuthorIds] = useState<string[]>([]);
  const [openPostId, setOpenPostId] = useState(getPostHashId);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [revealAll, setRevealAll] = useState(false);

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("theory").then((savedPosts) => {
        setPosts(savedPosts.filter((post) => !post.incognito));
      });
    }

    syncPosts();
    async function syncLogin() {
      setIsLoggedIn(Boolean(await getActiveMemberId()));
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
          <label className="grid w-52 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
            />
          </label>
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
            <option value="ghosts">Ghosts</option>
            <option value="creators">Creator/Influencer</option>
            <option value="anon">Anon</option>
          </select>
        </label>
      </div>

      {sortedPosts.length ? (
        <div className="grid gap-3">
          {sortedPosts.map((post) => (
            <article
              key={post.id}
              id={`post-${post.id}`}
              className="theory-card border-2 border-[#1d7f12] bg-black px-4 py-4"
            >
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
              {openPostId === post.id ? (
                <>
                  <button
                    type="button"
                    onClick={closePost}
                    className="mt-4 border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    back
                  </button>
                  <div className="mt-3">
                    <FavoriteButton postId={post.id} />
                  </div>
                  <div className="mt-3">
                    <CopyPostLinkButton path={`/theories#post-${post.id}`} />
                  </div>
                  {!post.anonymous && getAuthorName(post) ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      <Link
                        href={`/profile/${post.author}`}
                        className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                      >
                        {getAuthorName(post)}
                      </Link>
                    </p>
                  ) : post.anonymous ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      classified
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                    posted {formatPostTimestamp(post.createdAt)}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap font-mono text-base leading-7 text-[#39ff14]">
                    {post.body}
                  </p>
                  {getPostSources(post).length ? (
                    <div className="mt-4 grid gap-1">
                      {getPostSources(post).map((source) => (
                        <a
                          key={source}
                          href={getSourceHref(source)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid grid-cols-[1.5rem_1fr] text-xs font-black uppercase tracking-[0.14em] text-[#7f9f78] transition hover:text-[#39ff14]"
                        >
                          <span>+</span>
                          <span className="break-all">{source}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="border-2 border-[#1d7f12] bg-black px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
          theory board awaiting submissions
        </div>
      )}
    </div>
  );
}
