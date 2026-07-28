"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  BayPostComment,
  BayPostTruthVoteSummary,
} from "../../lib/bay-space-types";

type PostEngagementPanelProps = {
  isLoggedIn: boolean;
  onTruthSummaryChange?: (summary: BayPostTruthVoteSummary) => void;
  postId: string;
};

type CommentsResponse = {
  comments?: BayPostComment[];
  message?: string;
};

type TruthVoteResponse = {
  summary?: BayPostTruthVoteSummary;
  message?: string;
};

const defaultTruthScore = 6;

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTruthPointLabel(pointValue: number) {
  return `${pointValue} ${pointValue === 1 ? "point" : "points"}`;
}

export default function PostEngagementPanel({
  isLoggedIn,
  onTruthSummaryChange,
  postId,
}: PostEngagementPanelProps) {
  const [comments, setComments] = useState<BayPostComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [truthScore, setTruthScore] = useState(defaultTruthScore);
  const [truthSummary, setTruthSummary] = useState<BayPostTruthVoteSummary>({
    averageScore: 0,
    pointValue: 0,
    scoreTotal: 0,
    userScore: null,
    voteCount: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function syncEngagement() {
      setIsLoading(true);
      setErrorMessage("");

      const [commentsResponse, truthVoteResponse] = await Promise.all([
        fetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
          cache: "no-store",
        }),
        fetch(`/api/posts/${encodeURIComponent(postId)}/truth-vote`, {
          cache: "no-store",
        }),
      ]);
      const commentsData =
        (await commentsResponse.json()) as CommentsResponse;
      const truthVoteData =
        (await truthVoteResponse.json()) as TruthVoteResponse;

      if (!isMounted) {
        return;
      }

      setComments(commentsData.comments ?? []);

      if (truthVoteData.summary) {
        setTruthSummary(truthVoteData.summary);
        setTruthScore(truthVoteData.summary.userScore ?? defaultTruthScore);
      }

      setIsLoading(false);
    }

    syncEngagement().catch(() => {
      if (isMounted) {
        setErrorMessage("engagement offline");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [postId]);

  async function saveComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCommentBody = commentBody.trim();

    if (!nextCommentBody || isCommentSaving) {
      return;
    }

    setIsCommentSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: nextCommentBody }),
        },
      );
      const data = (await response.json()) as {
        comment?: BayPostComment;
        message?: string;
      };

      if (!response.ok || !data.comment) {
        setErrorMessage(data.message ?? "comment not saved");
        return;
      }

      const savedComment = data.comment;

      setComments((currentComments) => [...currentComments, savedComment]);
      setCommentBody("");
    } catch {
      setErrorMessage("comment not saved");
    } finally {
      setIsCommentSaving(false);
    }
  }

  async function saveTruthVote() {
    if (!isLoggedIn || isVoting) {
      return;
    }

    setIsVoting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/truth-vote`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ score: truthScore }),
        },
      );
      const data = (await response.json()) as TruthVoteResponse;

      if (!response.ok || !data.summary) {
        setErrorMessage(data.message ?? "truth vote not saved");
        return;
      }

      setTruthSummary(data.summary);
      setTruthScore(data.summary.userScore ?? truthScore);
      onTruthSummaryChange?.(data.summary);
    } catch {
      setErrorMessage("truth vote not saved");
    } finally {
      setIsVoting(false);
    }
  }

  const voteButtonLabel =
    truthSummary.userScore === truthScore ? "undo vote" : "vote";

  return (
    <section className="mt-6 grid gap-5 border-t border-[#1d7f12] pt-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
              truth vote
            </h3>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
              {truthSummary.voteCount} votes / avg{" "}
              {truthSummary.averageScore.toFixed(1)} /{" "}
              {getTruthPointLabel(truthSummary.pointValue)}
            </p>
          </div>
          <p className="text-4xl font-black leading-none text-[#39ff14] [text-shadow:0_0_14px_#39ff14]">
            {truthScore}
          </p>
        </div>
        <input
          type="range"
          min="0"
          max="11"
          step="1"
          value={truthScore}
          onChange={(event) => setTruthScore(Number(event.target.value))}
          className="w-full accent-[#39ff14]"
          aria-label="Truth scale"
        />
        <button
          type="button"
          disabled={!isLoggedIn || isVoting}
          onClick={saveTruthVote}
          className="w-fit border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:cursor-not-allowed disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent disabled:hover:text-[#7f9f78]"
        >
          {isVoting ? "saving" : voteButtonLabel}
        </button>
      </div>

      <div className="grid gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
          comments
        </h3>
        {isLoading ? (
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
            loading
          </p>
        ) : comments.length ? (
          <div className="grid max-h-72 gap-3 overflow-y-auto pr-2">
            {comments.map((comment) => (
              <article
                key={comment.id}
                className="border border-[#1d7f12] bg-black px-3 py-3"
              >
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                  {comment.authorName || `member ${comment.author}`} /{" "}
                  {formatTimestamp(comment.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-[#d7ffd0]">
                  {comment.body}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
            no comments
          </p>
        )}

        {isLoggedIn ? (
          <form onSubmit={saveComment} className="grid gap-3">
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value.slice(0, 600))}
              rows={3}
              className="min-h-24 resize-y border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
              placeholder="comment"
              aria-label="Comment"
            />
            <button
              type="submit"
              disabled={isCommentSaving || !commentBody.trim()}
              className="w-fit border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:cursor-not-allowed disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent disabled:hover:text-[#7f9f78]"
            >
              {isCommentSaving ? "saving" : "post comment"}
            </button>
          </form>
        ) : (
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
            sign in to comment or vote
          </p>
        )}

        {errorMessage ? (
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
