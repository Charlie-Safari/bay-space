"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CodeAccessDock from "../components/code-access-dock";
import DosCodeBox from "../components/dos-code-box";
import {
  BayPost,
  getBayPostsByCategory,
  getDateKey,
  postStoreEvent,
} from "../components/post-store";
import {
  countFavoritePosts,
  favoriteStoreEvent,
} from "../components/favorite-store";
import {
  formatPointTenths,
  getBaySpacePostPointTenths,
} from "../../lib/bay-space-scoring";

type TotalPointsWindow = "today" | "week" | "all";

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateLine(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getTopStoryScoreTenths(
  post: BayPost,
  favoriteCounts: Record<string, number>,
) {
  return getBaySpacePostPointTenths(post, favoriteCounts);
}

export default function NewsHeadlineTerminal() {
  const todayKey = useMemo(() => getDateKey(), []);
  const weekStartKey = useMemo(() => getDateKey(addDays(new Date(), -6)), []);
  const [totalPointsWindow, setTotalPointsWindow] =
    useState<TotalPointsWindow>("all");
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const rankedPosts = useMemo(() => {
    const windowedPosts = posts.filter((post) => {
      if (totalPointsWindow === "today") {
        return post.dateKey === todayKey;
      }

      if (totalPointsWindow === "week") {
        return post.dateKey >= weekStartKey;
      }

      return true;
    });

    return [...windowedPosts].sort((leftPost, rightPost) => {
      const scoreDifference =
        getTopStoryScoreTenths(rightPost, favoriteCounts) -
        getTopStoryScoreTenths(leftPost, favoriteCounts);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return (
        new Date(rightPost.createdAt).getTime() -
        new Date(leftPost.createdAt).getTime()
      );
    });
  }, [favoriteCounts, posts, todayKey, totalPointsWindow, weekStartKey]);
  const activePost = rankedPosts[0] ?? null;

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("daily-food").then((savedPosts) => {
        setPosts(savedPosts.filter((post) => !post.incognito));
      });
    }

    syncPosts();
    window.addEventListener("storage", syncPosts);
    window.addEventListener(postStoreEvent, syncPosts);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(postStoreEvent, syncPosts);
    };
  }, []);

  useEffect(() => {
    async function syncFavoriteCounts() {
      setFavoriteCounts(await countFavoritePosts(posts.map((post) => post.id)));
    }

    syncFavoriteCounts();
    window.addEventListener("storage", syncFavoriteCounts);
    window.addEventListener(favoriteStoreEvent, syncFavoriteCounts);

    return () => {
      window.removeEventListener("storage", syncFavoriteCounts);
      window.removeEventListener(favoriteStoreEvent, syncFavoriteCounts);
    };
  }, [posts]);

  return (
    <div className="grid w-full max-w-5xl gap-6">
      <label className="grid w-fit gap-2 justify-self-end">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          total points
        </span>
        <select
          value={totalPointsWindow}
          onChange={(event) =>
            setTotalPointsWindow(event.target.value as TotalPointsWindow)
          }
          className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
        >
          <option value="all">All Time</option>
          <option value="today">today</option>
          <option value="week">this week</option>
        </select>
      </label>
      <Link
        href={activePost ? `/news/post?id=${activePost.id}` : "/news/post"}
        className="group flex min-h-32 w-full items-center overflow-hidden border-2 border-[#39ff14] bg-black px-5 py-8 shadow-[0_0_24px_rgba(57,255,20,0.24)] transition hover:bg-[#031403] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        <div className="w-full">
          <span className="block text-xs font-black uppercase tracking-[0.28em] text-[#d7ffd0]">
            {activePost
              ? `${formatDateLine(new Date(activePost.createdAt))} - ${
                  formatPointTenths(
                    getTopStoryScoreTenths(activePost, favoriteCounts),
                  )
                } priority`
              : "total points waiting"}
          </span>
          <span className="mt-4 block overflow-hidden text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14] [text-shadow:0_0_14px_#39ff14] sm:text-4xl">
            <span className="top-story-banner-track">
              {[0, 1].map((repeat) => (
                <span key={repeat} className="top-story-banner-line">
                  <span>{activePost?.title || "top story banner"}</span>
                  <span aria-hidden="true">---</span>
                  <span>{activePost?.title || "top story banner"}</span>
                  <span aria-hidden="true">---</span>
                </span>
              ))}
            </span>
          </span>
        </div>
      </Link>
      <div className="grid gap-3">
        {rankedPosts.slice(0, 8).map((post, index) => (
          <Link
            key={post.id}
            href={`/news/post?id=${post.id}`}
            className="grid gap-2 border border-[#1d7f12] bg-black px-4 py-3 text-[#d7ffd0] transition hover:border-[#39ff14] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] sm:grid-cols-[4rem_1fr_5rem] sm:items-center"
          >
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
              #{index + 1}
            </span>
            <span className="text-sm font-black uppercase tracking-[0.12em]">
              {post.title}
            </span>
            <span className="text-sm font-black text-[#39ff14]">
              {formatPointTenths(getTopStoryScoreTenths(post, favoriteCounts))} pts
            </span>
          </Link>
        ))}
      </div>

      <CodeAccessDock>
        {(mode) => (
          <DosCodeBox
            ariaLabel={`Enter ${mode} top story code`}
            autoFocus
            id={`top-story-${mode}-code`}
            label={mode === "rc" ? "RC code" : "classified code"}
            maxLength={7}
            onSubmitCode={() => undefined}
          />
        )}
      </CodeAccessDock>
    </div>
  );
}
