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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatDateLine(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTimelineDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function NewsHeadlineTerminal() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [activeDate, setActiveDate] = useState(today);
  const [posts, setPosts] = useState<BayPost[]>([]);
  const canMoveForward = activeDate < today;
  const nextTimelineDate = addDays(activeDate, 1);
  const previousTimelineDate = addDays(activeDate, -1);
  const activeDateKey = getDateKey(activeDate);
  const activePost =
    posts.find((post) => post.dateKey === activeDateKey) ?? null;

  useEffect(() => {
    function syncPosts() {
      getBayPostsByCategory("top-story").then((savedPosts) => {
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

  function moveDate(days: number) {
    setActiveDate((currentDate) => {
      const nextDate = addDays(currentDate, days);

      return nextDate > today ? today : nextDate;
    });
  }

  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_130px] lg:items-center">
      <Link
        href={activePost ? `/news/post?id=${activePost.id}` : "/news/post"}
        className="group flex min-h-32 w-full items-center overflow-hidden border-2 border-[#39ff14] bg-black px-5 py-8 shadow-[0_0_24px_rgba(57,255,20,0.24)] transition hover:bg-[#031403] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        <div className="w-full">
          <span className="block text-xs font-black uppercase tracking-[0.28em] text-[#d7ffd0]">
            {formatDateLine(activeDate)}
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

      <aside
        aria-label="Post timeline"
        className="justify-self-start lg:justify-self-end"
      >
        <div className="flex w-28 flex-col items-center gap-3 text-[#39ff14]">
          <button
            type="button"
            onClick={() => moveDate(1)}
            disabled={!canMoveForward}
            className="border border-[#1d7f12] px-3 py-1 text-lg font-black leading-none transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#1d7f12] disabled:hover:bg-transparent disabled:hover:text-[#39ff14]"
            aria-label="Move timeline forward one day"
          >
            ^
          </button>
          <div className="flex h-24 flex-col items-center justify-center gap-3">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7f9f78]">
              {nextTimelineDate <= today
                ? formatTimelineDate(nextTimelineDate)
                : "current"}
            </span>
            <span className="h-12 w-px bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
          </div>
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              {formatMonth(activeDate)}
            </div>
            <div className="mt-1 text-5xl font-black leading-none [text-shadow:0_0_14px_#39ff14]">
              {activeDate.getDate()}
            </div>
          </div>
          <div className="flex h-24 flex-col items-center justify-center gap-3">
            <span className="h-12 w-px bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
            <span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7f9f78]">
              {formatTimelineDate(previousTimelineDate)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => moveDate(-1)}
            className="border border-[#1d7f12] px-3 py-1 text-lg font-black leading-none transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
            aria-label="Move timeline back one day"
          >
            V
          </button>
        </div>
      </aside>

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
