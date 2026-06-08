"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BayPost, getBayPostsByCategory } from "../../components/post-store";
import CopyPostLinkButton from "../../components/copy-post-link-button";
import FavoriteButton from "../../components/favorite-button";
import { isBayoClub } from "../../../lib/bay-space-roles";
import {
  formatPointTenths,
  getPostPointTenths,
  getPostShareLinkClickCount,
} from "../../../lib/bay-space-scoring";
import { countFavoritePosts } from "../../components/favorite-store";
import { claimPostVisit } from "../../components/post-visit-client";

type SavedMember = {
  member: string;
  name: string;
  roles?: string;
};

type TopStoryPostProps = {
  postId?: string;
};

export default function TopStoryPost({ postId = "" }: TopStoryPostProps) {
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("daily-food").then((savedPosts) => {
        setPosts(savedPosts.filter((post) => !post.incognito));
      });
    }

    syncPosts();
    fetch("/api/members", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { members: [] }))
      .then((data: { members?: SavedMember[] }) => {
        setMembers(data.members ?? []);
      });
    window.addEventListener("storage", syncPosts);
    window.addEventListener("bay-space-posts", syncPosts);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener("bay-space-posts", syncPosts);
    };
  }, []);

  useEffect(() => {
    if (!postId) {
      return;
    }

    if (!claimPostVisit(postId)) {
      return;
    }

    let isMounted = true;
    fetch(`/api/posts/${encodeURIComponent(postId)}/visit`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { postVisits?: number } | null) => {
        if (!isMounted || typeof data?.postVisits !== "number") {
          return;
        }

        setPosts((currentPosts) =>
          currentPosts.map((currentPost) =>
            currentPost.id === postId
              ? {
                  ...currentPost,
                  meta: {
                    ...(currentPost.meta ?? {}),
                    postVisits: String(data.postVisits),
                  },
                }
              : currentPost,
          ),
        );
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [postId]);

  useEffect(() => {
    countFavoritePosts(posts.map((post) => post.id)).then(setFavoritePostCounts);
  }, [posts]);

  const post =
    posts.find((savedPost) => savedPost.id === postId) ?? posts[0] ?? null;
  const author = members.find((member) => member.member === post?.author);
  const authorName = author?.name.trim() ?? "";
  const authorDisplayName =
    authorName && isBayoClub(author?.roles ?? "") ? `${authorName} 🦉` : authorName;
  const tags = getDailyFoodTags(post);
  const sources = getPostSources(post);
  const postPoints = post ? formatPointTenths(getPostPointTenths(post, favoritePostCounts)) : "0";

  if (!post) {
    return (
      <div className="mt-10 max-w-3xl border-2 border-[#1d7f12] bg-black px-4 py-5 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
        diamond chamber awaiting daily food saves
      </div>
    );
  }

  return (
    <article className="mt-10 max-w-3xl border-2 border-[#39ff14] bg-black px-5 py-6 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          {new Date(post.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-right text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
          {postPoints} pts
        </p>
      </div>
      {!post.anonymous && authorName ? (
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
          <Link
            href={`/profile/${post.author}`}
            className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
          >
            {authorDisplayName}
          </Link>
        </p>
      ) : post.anonymous ? (
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
          classified
        </p>
      ) : null}
      <h2 className="mt-4 text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
        {post.title}
      </h2>
      <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-[#d7ffd0]">
        {tags.length ? tags.map((tag) => tag.text).join("\n") : post.body || "no report filed"}
      </p>
      {sources.length ? (
        <section className="mt-5 border-t border-[#1d7f12] pt-3">
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
            SOURCES
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-5">
            {sources.map((source) => (
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
        <CopyPostLinkButton
          path={`/news/post?id=${post.id}`}
          shareClickCount={getPostShareLinkClickCount(post)}
          shareCountPath={`/api/posts/${encodeURIComponent(post.id)}/share-link`}
        />
      </div>
    </article>
  );
}

function getPostSources(post: BayPost | null) {
  if (!post) {
    return [];
  }

  const sourceLinks = post.meta?.sourceLinks;
  const tagSources = post.meta?.tagSources;
  const sources = post.meta?.sources;

  const sourceValues = [
    ...(Array.isArray(sourceLinks) ? sourceLinks : []),
    ...(Array.isArray(tagSources) ? tagSources : []),
    ...(Array.isArray(sources) ? sources : []),
  ].filter((source): source is string => typeof source === "string" && Boolean(source));

  return Array.from(new Set(sourceValues));
}

function getDailyFoodTags(post: BayPost | null) {
  if (!post) {
    return [];
  }

  const tags = post.meta?.tags;
  const tagSources = post.meta?.tagSources;

  if (Array.isArray(tags) && tags.length) {
    return tags
      .map((tag, index) => ({
        source: Array.isArray(tagSources) ? tagSources[index] ?? "" : "",
        text: typeof tag === "string" ? tag : "",
      }))
      .filter((tag) => tag.text);
  }

  const fallbackSources = getPostSources(post);

  return post.body
    .split("\n")
    .filter(Boolean)
    .map((tag, index) => ({
      source: fallbackSources[index] ?? "",
      text: tag,
    }));
}

function getSourceHref(source: string) {
  return source.startsWith("http://") || source.startsWith("https://")
    ? source
    : `https://${source}`;
}
