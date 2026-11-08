"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BayPost,
  getBayPosts,
  postStoreEvent,
} from "../components/post-store";
import CopyPostLinkButton from "../components/copy-post-link-button";
import FavoriteButton from "../components/favorite-button";
import {
  countFavoritePosts,
  favoriteStoreEvent,
} from "../components/favorite-store";
import { recordPostVisit } from "../components/post-visit-client";
import { isBayoClub } from "../../lib/bay-space-roles";
import {
  formatPointTenths,
  getBaySpacePostPointTenths,
  isCryptiPost,
} from "../../lib/bay-space-scoring";
import LibraryHowTo from "./library-how-to";
import {
  doPostTopicTagsMatchQuery,
  getMatchingPostTopicTags,
  getPostTopicTags,
  getPostTopicTagSearchText,
} from "../../lib/bay-space-tags";

type SavedMember = {
  member: string;
  name: string;
  roles?: string;
};

function getLibraryHashId() {
  if (typeof window === "undefined") {
    return "";
  }

  const postId = window.location.hash.replace(/^#library-/, "");

  return postId === window.location.hash ? "" : postId;
}

function getPostSources(post: BayPost) {
  const sourceLinks = post.meta?.sourceLinks;
  const sources = post.meta?.sources;
  const source = post.meta?.source;

  return [
    ...(Array.isArray(sourceLinks) ? sourceLinks : []),
    ...(Array.isArray(sources) ? sources : []),
    ...(typeof source === "string" && source ? [source] : []),
  ];
}

function getSourceHref(source: string) {
  return source.startsWith("http://") || source.startsWith("https://")
    ? source
    : `https://${source}`;
}

function isLibraryPost(post: BayPost) {
  return post.category === "library-submission" || Boolean(post.shelfCode);
}

function isTagSearchPost(post: BayPost) {
  return (
    !post.incognito &&
    (post.category === "daily-food" || post.category === "theory")
  );
}

function getPostChannelLabel(post: BayPost) {
  if (post.category === "daily-food") {
    return "Current Events";
  }

  if (post.category === "theory") {
    return "Conspiracy";
  }

  if (post.category === "top-story") {
    return "Top Story";
  }

  return "Library";
}

function getPostLinkPath(post: BayPost) {
  if (post.category === "daily-food") {
    return `/facts-on-news#post-${post.id}`;
  }

  if (post.category === "theory") {
    return `/theories#post-${post.id}`;
  }

  if (post.category === "top-story") {
    return `/news/post?id=${post.id}`;
  }

  return `/library#library-${post.id}`;
}

function getLibrarySearchText(post: BayPost) {
  return [
    post.title,
    post.body,
    post.shelfLabel ?? "",
    post.shelfCode ?? "",
    getPostSources(post).join(" "),
    getPostTopicTagSearchText(post),
  ]
    .join(" ")
    .toLowerCase();
}

export default function LibraryBoard() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});
  const [openPostId, setOpenPostId] = useState(getLibraryHashId);

  useEffect(() => {
    function syncPosts() {
      getBayPosts().then((savedPosts) => {
        setPosts(savedPosts.filter((post) => !isCryptiPost(post)));
      });
    }

    syncPosts();
    fetch("/api/members", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { members: [] }))
      .then((data: { members?: SavedMember[] }) => {
        setMembers(data.members ?? []);
      });
    window.addEventListener("storage", syncPosts);
    window.addEventListener(postStoreEvent, syncPosts);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(postStoreEvent, syncPosts);
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

  function canShowBayoPlusAnonProfile(post: BayPost) {
    return post.anonymous && post.author !== "unknown" && isBayoClub(getAuthorRoles(post));
  }

  useEffect(() => {
    function openFromHash() {
      const postId = getLibraryHashId();

      if (!postId) {
        return;
      }

      setOpenPostId(postId);
    }

    openFromHash();
    window.addEventListener("hashchange", openFromHash);

    return () => {
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  useEffect(() => {
    if (!openPostId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`library-${openPostId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [openPostId, posts]);

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

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts
      .filter((post) => {
        if (!normalizedQuery) {
          return isLibraryPost(post);
        }

        if (isLibraryPost(post)) {
          return getLibrarySearchText(post).includes(normalizedQuery);
        }

        return isTagSearchPost(post) && doPostTopicTagsMatchQuery(post, query);
      })
      .sort((leftPost, rightPost) =>
        leftPost.title.localeCompare(rightPost.title),
      );
  }, [posts, query]);

  return (
    <div className="mt-10 grid max-w-3xl gap-5">
      <label className="grid w-fit gap-2">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          organize
        </span>
        <select
          value="az"
          className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
          disabled
        >
          <option value="az">A-Z</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          search library context
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
        />
      </label>

      {visiblePosts.length ? (
        <div className="grid gap-3">
          {visiblePosts.map((post) => {
            const postScore = formatPointTenths(
              getBaySpacePostPointTenths(post, favoritePostCounts),
            );
            const matchingTopicTags = query.trim()
              ? getMatchingPostTopicTags(post, query)
              : [];
            const topicTags = getPostTopicTags(post);
            const postChannelLabel = getPostChannelLabel(post);

            return (
            <article
              key={post.id}
              id={`library-${post.id}`}
              className="border-2 border-[#1d7f12] bg-black px-4 py-4 transition hover:border-[#39ff14]"
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
                <span className="block text-xs font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                  {isLibraryPost(post)
                    ? `shelf label: ${post.shelfLabel || post.title}`
                    : `${postChannelLabel} tag match`}
                </span>
                <span className="mt-2 block text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                  channel: {postChannelLabel}
                </span>
                <span className="mt-2 block text-xl font-black uppercase tracking-[0.14em]">
                  {post.title}
                </span>
                {matchingTopicTags.length ? (
                  <span className="mt-3 flex flex-wrap gap-2">
                    {matchingTopicTags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-[#1d7f12] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#39ff14]"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
              {openPostId === post.id ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
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
                  <div className="mt-3">
                    <CopyPostLinkButton path={getPostLinkPath(post)} />
                  </div>
                  {!post.anonymous && getAuthorName(post) ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      <Link
                        href={`/profile/${post.author}`}
                        className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                      >
                        {getAuthorDisplayName(post)}
                      </Link>
                    </p>
                  ) : post.anonymous ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      {canShowBayoPlusAnonProfile(post) ? (
                        <Link
                          href={`/profile/${post.author}`}
                          className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                        >
                          anon
                        </Link>
                      ) : (
                        "classified"
                      )}
                    </p>
                  ) : null}
                  <span className="mt-3 block whitespace-pre-wrap text-sm font-bold leading-6">
                    {post.body}
                  </span>
                  {getPostSources(post).length ? (
                    <div className="mt-4 grid gap-1">
                      {getPostSources(post).map((source) => (
                        <a
                          key={source}
                          href={getSourceHref(source)}
                          className="grid grid-cols-[1.5rem_1fr] text-xs font-black uppercase tracking-[0.14em] text-[#7f9f78] transition hover:text-[#39ff14]"
                        >
                          <span>+</span>
                          <span className="break-all">{source}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {topicTags.length ? (
                    <section className="mt-5 border-t border-[#1d7f12] pt-3">
                      <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
                        TAGS
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {topicTags.map((tag) => (
                          <span
                            key={tag}
                            className="border border-[#1d7f12] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#39ff14]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </article>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-[#1d7f12] bg-black px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
          public stacks cleared
        </div>
      )}

      <LibraryHowTo />
    </div>
  );
}
