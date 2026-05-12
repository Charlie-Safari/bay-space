"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BayPost,
  getBayPostsByCategory,
  postStoreEvent,
} from "../components/post-store";

type SortMode = "az" | "date";

export default function TheoryBoard() {
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [posts, setPosts] = useState<BayPost[]>([]);

  useEffect(() => {
    function syncPosts() {
      setPosts(getBayPostsByCategory("theory").filter((post) => !post.incognito));
    }

    syncPosts();
    window.addEventListener("storage", syncPosts);
    window.addEventListener(postStoreEvent, syncPosts);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(postStoreEvent, syncPosts);
    };
  }, []);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((leftPost, rightPost) => {
      if (sortMode === "az") {
        return leftPost.title.localeCompare(rightPost.title);
      }

      return (
        new Date(rightPost.createdAt).getTime() -
        new Date(leftPost.createdAt).getTime()
      );
    });
  }, [posts, sortMode]);

  return (
    <div className="mt-10 grid max-w-4xl gap-6">
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

      {sortedPosts.length ? (
        <div className="grid gap-3">
          {sortedPosts.map((post) => (
            <article
              key={post.id}
              className="border-2 border-[#1d7f12] bg-black px-4 py-4"
            >
              <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#39ff14]">
                {post.title}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#d7ffd0]">
                {post.body}
              </p>
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
