"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BayPost, getBayPostsByCategory } from "../../components/post-store";
import CopyPostLinkButton from "../../components/copy-post-link-button";
import FavoriteButton from "../../components/favorite-button";
import TicketVoteButton, {
  cryptiTicketVoteButtonDefaults,
} from "../../components/ticket-vote-button";
import {
  formatPointTenths,
  getPostPointTenths,
  getPostVisitCount,
} from "../../../lib/bay-space-scoring";
import { countFavoritePosts } from "../../components/favorite-store";
import { claimPostVisit } from "../../components/post-visit-client";

type SavedMember = {
  member: string;
  name: string;
  roles?: string;
};

type CryptiPostDetailProps = {
  postId?: string;
};

type CryptiTicker = {
  symbol: string;
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

function getPostTickersMentioned(post: BayPost | null) {
  if (!post) {
    return [];
  }

  const tickersMentioned = post.meta?.tickersMentioned;

  if (Array.isArray(tickersMentioned)) {
    return tickersMentioned.filter(
      (ticker): ticker is string => typeof ticker === "string" && Boolean(ticker),
    );
  }

  return typeof tickersMentioned === "string" && tickersMentioned
    ? [tickersMentioned]
    : [];
}

function getCryptiTicketVoteCount(post: BayPost | null) {
  const count = Number(post?.meta?.cryptiTicketVotes ?? 0);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function getSourceHref(source: string) {
  return source.startsWith("http://") || source.startsWith("https://")
    ? source
    : `https://${source}`;
}

function getCryptiSourceMode(post: BayPost | null) {
  const sourceMode = post?.meta?.cryptiSourceMode;

  return sourceMode === "Q" || sourceMode === "S" ? sourceMode : "R";
}

function getCryptiPostDisplayLines(post: BayPost | null) {
  if (!post) {
    return [];
  }

  const sourceMode = getCryptiSourceMode(post);
  const lines = post.body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (sourceMode !== "R" && sourceMode !== "Q") {
    return lines;
  }

  const displayLines: string[] = [];
  let skipNextSourceLine = false;
  let skipRemainingSourceLines = false;

  lines.forEach((line) => {
    const normalizedLine = line
      .replace(/[—-]/g, "-")
      .replace(/\s+/g, " ")
      .toUpperCase();

    if (/^OTHER SOURCES?:?$/.test(normalizedLine)) {
      skipRemainingSourceLines = true;
      return;
    }

    if (skipRemainingSourceLines) {
      return;
    }

    if (/^SOURCE:?$/.test(normalizedLine)) {
      skipNextSourceLine = true;
      return;
    }

    if (skipNextSourceLine) {
      skipNextSourceLine = false;
      return;
    }

    if (/^SUPPORT CLAIM \d+:?$/.test(normalizedLine)) {
      return;
    }

    if (/^ANTI-?THESIS ?\d*:?$/.test(normalizedLine)) {
      return;
    }

    displayLines.push(line);
  });

  return displayLines;
}

function getCryptiSourceLabel(sourceMode: string) {
  if (sourceMode === "Q") {
    return "Q DEGEN";
  }

  if (sourceMode === "S") {
    return "S BUZZ";
  }

  return "R NEWS";
}

export default function CryptiPostDetail({ postId = "" }: CryptiPostDetailProps) {
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [cryptiTicketPostIds, setCryptiTicketPostIds] = useState<string[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});
  const [libraryTickerSymbols, setLibraryTickerSymbols] = useState<string[]>([]);
  const [shakingTicker, setShakingTicker] = useState("");

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
    const postIds = posts.map((savedPost) => savedPost.id);

    countFavoritePosts(postIds).then(setFavoritePostCounts);
  }, [posts]);

  useEffect(() => {
    fetch("/api/crypti/ticket-vote", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { postIds: [] }))
      .then((data: { postIds?: string[] }) => {
        setCryptiTicketPostIds(data.postIds ?? []);
      });
  }, []);

  useEffect(() => {
    fetch("/api/crypti/tickers?search=", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { tickers: [] }))
      .then((data: { tickers?: CryptiTicker[] }) => {
        setLibraryTickerSymbols(
          (data.tickers ?? []).map((ticker) => ticker.symbol),
        );
      });
  }, []);

  const post =
    posts.find((savedPost) => savedPost.id === postId) ?? posts[0] ?? null;
  const author = members.find((member) => member.member === post?.author);
  const authorName = author?.name.trim() ?? "";
  const authorDisplayName = post?.anonymous ? "anonymous" : authorName;
  const receiptLines = getCryptiPostDisplayLines(post);
  const sources = getPostSources(post);
  const tickersMentioned = getPostTickersMentioned(post);
  const sourceMode = getCryptiSourceMode(post);
  const sourceLabel = getCryptiSourceLabel(sourceMode);
  const sourceHref = `/crypti?source=${sourceMode}`;
  const postPoints = post ? formatPointTenths(getPostPointTenths(post, favoritePostCounts)) : "0";

  function updateCryptiTicketState(ticketVotes: number, isTicketed: boolean) {
    if (!post) {
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        currentPost.id === post.id
          ? {
              ...currentPost,
              meta: {
                ...(currentPost.meta ?? {}),
                cryptiTicketVotes: String(ticketVotes),
              },
            }
          : currentPost,
      ),
    );
    setCryptiTicketPostIds((postIds) =>
      isTicketed
        ? Array.from(new Set([...postIds, post.id]))
        : postIds.filter((ticketedPostId) => ticketedPostId !== post.id),
    );
  }

  function shakeMissingTicker(ticker: string) {
    setShakingTicker("");
    window.setTimeout(() => setShakingTicker(ticker), 0);
    window.setTimeout(() => setShakingTicker(""), 220);
  }

  if (!post) {
    return (
      <div className="mt-10 max-w-3xl border-2 border-[#1d7f12] bg-black px-4 py-5 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
        crypti post not found
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
        <span>C:\</span>
        <Link
          href="/briefing-room"
          className="transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          BAY-SPACE
        </Link>
        <span>\</span>
        <Link
          href="/crypti"
          className="transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          +CRYPTI
        </Link>
        <span>\</span>
        <Link
          href={sourceHref}
          className="transition hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          {sourceLabel}
        </Link>
        <span>&gt; POST</span>
      </p>
      <div className="flex flex-wrap items-end gap-5">
        <h1 className="text-5xl font-black uppercase tracking-[0.18em] text-[#d7ffd0] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
          +CRYPTI
        </h1>
        <Link
          href={sourceHref}
          className="mb-2 w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          BACK
        </Link>
      </div>
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
      {tickersMentioned.length ? (
        <section className="mt-5 border-t border-[#1d7f12] pt-3">
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
            TICKERS MENTIONED
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {tickersMentioned.map((ticker) => (
              libraryTickerSymbols.includes(ticker) ? (
                <Link
                  key={ticker}
                  href={`/crypti?ticker=${encodeURIComponent(ticker)}`}
                  className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  ◈ {ticker}
                </Link>
              ) : (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => shakeMissingTicker(ticker)}
                  className={`border border-[#1d7f12] bg-[#001100] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                    shakingTicker === ticker
                      ? "animate-[option-shake_180ms_linear]"
                      : ""
                  }`}
                >
                  ◈ {ticker}
                </button>
              )
            ))}
          </div>
        </section>
      ) : null}
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
        <FavoriteButton
          onCountChange={(count) =>
            setFavoritePostCounts((counts) => ({
              ...counts,
              [post.id]: count,
            }))
          }
          postId={post.id}
        />
        <TicketVoteButton
          availabilityPath="/api/crypti/ticket-vote"
          initialCount={getCryptiTicketVoteCount(post)}
          isActive={cryptiTicketPostIds.includes(post.id)}
          onCountChange={updateCryptiTicketState}
          postId={post.id}
          votePath={`/api/posts/${post.id}/crypti-ticket`}
          {...cryptiTicketVoteButtonDefaults}
        />
        <CopyPostLinkButton
          path={`/crypti/post?id=${post.id}`}
          visitCount={getPostVisitCount(post)}
        />
      </div>
      </article>
    </>
  );
}
