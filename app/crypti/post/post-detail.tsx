"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BayPost, getBayPostsByCategory } from "../../components/post-store";
import CopyPostLinkButton from "../../components/copy-post-link-button";
import FavoriteButton from "../../components/favorite-button";

type SavedMember = {
  member: string;
  name: string;
  roles?: string;
};

type CryptiPostDetailProps = {
  postId?: string;
};

function isCryptiPost(post: BayPost) {
  return post.meta?.cryptiPost === "true";
}

function getPostSources(post: BayPost | null) {
  if (!post) {
    return [];
  }

  const sources = post.meta?.sources;

  return Array.isArray(sources)
    ? sources.filter(
        (source): source is string => typeof source === "string" && Boolean(source),
      )
    : [];
}

function getSourceHref(source: string) {
  return source.startsWith("http://") || source.startsWith("https://")
    ? source
    : `https://${source}`;
}

export default function CryptiPostDetail({ postId = "" }: CryptiPostDetailProps) {
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("theory").then((savedPosts) => {
        setPosts(savedPosts.filter(isCryptiPost));
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

  const post =
    posts.find((savedPost) => savedPost.id === postId) ?? posts[0] ?? null;
  const author = members.find((member) => member.member === post?.author);
  const authorName = author?.name.trim() ?? "";
  const authorDisplayName = post?.anonymous ? "anonymous" : authorName;
  const receiptLines =
    post?.body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean) ?? [];
  const sources = getPostSources(post);

  if (!post) {
    return (
      <div className="mt-10 max-w-3xl border-2 border-[#1d7f12] bg-black px-4 py-5 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
        crypti post not found
      </div>
    );
  }

  return (
    <article className="mt-10 max-w-3xl border-2 border-[#39ff14] bg-black px-5 py-6 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
        {new Date(post.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      {post.author !== "unknown" && (authorDisplayName || post.author) ? (
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
          <Link
            href={`/crypti?profile=${encodeURIComponent(post.author)}`}
            className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
          >
            {authorDisplayName || post.author}
          </Link>
        </p>
      ) : null}
      <h2 className="mt-4 text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
        {post.title}
      </h2>
      {receiptLines.length ? (
        <div className="mt-6 grid gap-3 text-base leading-7 text-[#d7ffd0]">
          {receiptLines.map((line, index) => (
            <div key={`${post.id}-${line}-${index}`} className="flex items-start gap-3">
              <span
                className="mt-2 h-2 w-2 shrink-0 bg-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.75)]"
                aria-hidden="true"
              />
              <p>{line}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-[#d7ffd0]">
          no receipts entered
        </p>
      )}
      {sources.length ? (
        <section className="mt-5 border-t border-[#1d7f12] pt-3">
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
            SOURCES
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-5">
            {sources.map((source, index) => (
              <li key={`${source}-${index}`}>
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
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <FavoriteButton postId={post.id} />
        <CopyPostLinkButton path={`/crypti/post?id=${post.id}`} />
      </div>
    </article>
  );
}
