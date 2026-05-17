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

export default function TheoryBoard() {
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all");
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoriteAuthorIds, setFavoriteAuthorIds] = useState<string[]>([]);
  const [openPostId, setOpenPostId] = useState(getPostHashId);

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("theory").then((savedPosts) => {
        setPosts(savedPosts.filter((post) => !post.incognito));
      });
    }

    syncPosts();
    async function syncFavorites() {
      setFavoriteAuthorIds(await getFavoriteAuthorIds());
    }

    syncFavorites();
    fetch("/api/members", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { members: [] }))
      .then((data: { members?: SavedMember[] }) => {
        setMembers(data.members ?? []);
      });
    window.addEventListener("storage", syncPosts);
    window.addEventListener(postStoreEvent, syncPosts);
    window.addEventListener("storage", syncFavorites);
    window.addEventListener("bay-space-auth", syncFavorites);
    window.addEventListener(favoriteStoreEvent, syncFavorites);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(postStoreEvent, syncPosts);
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

  const sortedPosts = useMemo(() => {
    const filteredPosts =
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

    return [...filteredPosts].sort((leftPost, rightPost) => {
      if (sortMode === "az") {
        return leftPost.title.localeCompare(rightPost.title);
      }

      return (
        new Date(rightPost.createdAt).getTime() -
        new Date(leftPost.createdAt).getTime()
      );
    });
  }, [authorFilter, favoriteAuthorIds, members, posts, sortMode]);

  return (
    <div className="mt-10 grid max-w-4xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
              className="border-2 border-[#1d7f12] bg-black px-4 py-4"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenPostId((currentId) =>
                    currentId === post.id ? "" : post.id,
                  )
                }
                className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              >
              <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#39ff14]">
                {post.title}
              </h2>
              </button>
              {openPostId === post.id ? (
                <>
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
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#d7ffd0]">
                    {post.body}
                  </p>
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
