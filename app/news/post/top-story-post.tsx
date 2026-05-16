"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BayPost, getBayPostsByCategory } from "../../components/post-store";
import CopyPostLinkButton from "../../components/copy-post-link-button";

type SavedMember = {
  member: string;
  name: string;
};

type TopStoryPostProps = {
  postId?: string;
};

export default function TopStoryPost({ postId = "" }: TopStoryPostProps) {
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("top-story").then(setPosts);
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
  const authorName =
    members.find((member) => member.member === post?.author)?.name.trim() ?? "";

  if (!post) {
    return (
      <div className="mt-10 max-w-3xl border-2 border-[#1d7f12] bg-black px-4 py-5 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
        full post chamber awaiting submission
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
      {!post.anonymous && authorName ? (
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
          <Link
            href={`/profile/${post.author}`}
            className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
          >
            {authorName}
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
        {post.body || "no report filed"}
      </p>
      <div className="mt-5">
        <CopyPostLinkButton path={`/news/post?id=${post.id}`} />
      </div>
    </article>
  );
}
