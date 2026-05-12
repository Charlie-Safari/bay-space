"use client";

import { useEffect, useState } from "react";
import { getBayPostsByCategory } from "../../components/post-store";

type TopStoryPostProps = {
  postId?: string;
};

export default function TopStoryPost({ postId = "" }: TopStoryPostProps) {
  const [postsVersion, setPostsVersion] = useState(0);
  void postsVersion;

  useEffect(() => {
    function syncPosts() {
      setPostsVersion((version) => version + 1);
    }

    window.addEventListener("storage", syncPosts);
    window.addEventListener("bay-space-posts", syncPosts);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener("bay-space-posts", syncPosts);
    };
  }, []);

  const posts = getBayPostsByCategory("top-story");
  const post =
    posts.find((savedPost) => savedPost.id === postId) ?? posts[0] ?? null;

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
      <h2 className="mt-4 text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
        {post.title}
      </h2>
      <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-[#d7ffd0]">
        {post.body || "no report filed"}
      </p>
    </article>
  );
}
