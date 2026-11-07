"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type {
  BayPostCategory,
  BayPostComment,
  BayPostTruthVoteSummary,
} from "../../lib/bay-space-types";
import type { BayoCardId } from "../../lib/bay-space-ranks";
import CurrentEventRatingScale from "./current-event-rating-scale";

type PostEngagementPanelProps = {
  isLoggedIn: boolean;
  onCommentSaved?: (comment: BayPostComment) => void;
  onTruthSummaryChange?: (summary: BayPostTruthVoteSummary) => void;
  postCategory?: BayPostCategory;
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
const publicCommentDeleteWindowMs = 2 * 60 * 1000;
const commentCharacterLimit = 500;

function getCharacterCount(value: string) {
  return Array.from(value.trim()).length;
}

function limitCharacters(value: string) {
  return Array.from(value).slice(0, commentCharacterLimit).join("");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTruthPointLabel(pointValue: number) {
  return `${pointValue} ${pointValue === 1 ? "point" : "points"}`;
}

function hasActiveCard(comment: BayPostComment, cardId: BayoCardId) {
  return Boolean(comment.authorActiveCards?.includes(cardId));
}

export default function PostEngagementPanel({
  isLoggedIn,
  onCommentSaved,
  onTruthSummaryChange,
  postCategory,
  postId,
}: PostEngagementPanelProps) {
  const [comments, setComments] = useState<BayPostComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [deletingCommentIds, setDeletingCommentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votingDimension, setVotingDimension] = useState<"truth" | "relevance" | null>(null);
  const isVoting = votingDimension !== null;
  const [now, setNow] = useState(Date.now);
  const isCurrentEvents =
    postCategory === "daily-food" || postCategory === "top-story";
  const [truthScore, setTruthScore] = useState(isCurrentEvents ? 0 : defaultTruthScore);
  const [relevanceScore, setRelevanceScore] = useState(0);
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

      const [commentsResponse, truthVoteResponse, memberResponse] = await Promise.all([
        fetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
          cache: "no-store",
        }),
        fetch(`/api/posts/${encodeURIComponent(postId)}/truth-vote`, {
          cache: "no-store",
        }),
        isLoggedIn && isCurrentEvents
          ? fetch("/api/me", { cache: "no-store" })
          : Promise.resolve(null),
      ]);
      const commentsData =
        (await commentsResponse.json()) as CommentsResponse;
      const truthVoteData =
        (await truthVoteResponse.json()) as TruthVoteResponse;
      const memberData = memberResponse?.ok
        ? ((await memberResponse.json()) as {
            member?: { availablePoints?: number } | null;
          })
        : null;

      if (!isMounted) {
        return;
      }

      setComments(commentsData.comments ?? []);
      setAvailablePoints(
        typeof memberData?.member?.availablePoints === "number"
          ? memberData.member.availablePoints
          : null,
      );

      if (truthVoteData.summary) {
        setTruthSummary(truthVoteData.summary);
        setTruthScore(truthVoteData.summary.userScore ?? (isCurrentEvents ? 0 : defaultTruthScore));
        setRelevanceScore(truthVoteData.summary.relevance?.userScore ?? 0);
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
  }, [isCurrentEvents, isLoggedIn, postId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

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
        pointCost?: number;
        remainingPoints?: number | null;
      };

      if (!response.ok || !data.comment) {
        setErrorMessage(data.message ?? "comment not saved");
        return;
      }

      const savedComment = data.comment;

      setComments((currentComments) => [...currentComments, savedComment]);
      onCommentSaved?.(savedComment);
      setCommentBody("");

      if ((data.pointCost ?? 0) > 0) {
        if (typeof data.remainingPoints === "number") {
          setAvailablePoints(data.remainingPoints);
        }
        window.dispatchEvent(new Event("bay-space-auth"));
      }
    } catch {
      setErrorMessage("comment not saved");
    } finally {
      setIsCommentSaving(false);
    }
  }

  async function saveTruthVote(dimension: "truth" | "relevance" = "truth") {
    if (!isLoggedIn || isVoting || isLoading) {
      return;
    }

    const score = dimension === "truth" ? truthScore : relevanceScore;
    const savedScore = dimension === "truth"
      ? truthSummary.userScore : truthSummary.relevance?.userScore;
    if (isCurrentEvents && score === 0) return;

    setVotingDimension(dimension);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/truth-vote`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(isCurrentEvents
            ? { score, dimension, remove: savedScore === score }
            : { score }),
        },
      );
      const data = (await response.json()) as TruthVoteResponse;

      if (!response.ok || !data.summary) {
        setErrorMessage(data.message ?? "truth vote not saved");
        return;
      }

      setTruthSummary(data.summary);
      if (dimension === "truth") {
        setTruthScore(data.summary.userScore ?? (isCurrentEvents ? 0 : truthScore));
      } else {
        setRelevanceScore(data.summary.relevance?.userScore ?? 0);
      }
      onTruthSummaryChange?.(data.summary);
      if (isCurrentEvents) window.dispatchEvent(new Event("bay-space-auth"));
    } catch {
      setErrorMessage("truth vote not saved");
    } finally {
      setVotingDimension(null);
    }
  }

  async function deleteComment(commentId: string) {
    if (deletingCommentIds.includes(commentId)) {
      return;
    }

    setDeletingCommentIds((current) => [...current, commentId]);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ commentId }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setErrorMessage(data?.message ?? "comment not deleted");
        return;
      }

      setComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      );
    } catch {
      setErrorMessage("comment not deleted");
    } finally {
      setDeletingCommentIds((current) =>
        current.filter((id) => id !== commentId),
      );
    }
  }

  const voteButtonLabel =
    truthSummary.userScore === truthScore ? "undo vote" : "vote";
  const commentCharacterCount = getCharacterCount(commentBody);
  const commentRequiresLogin = isCurrentEvents && !isLoggedIn;
  const lacksCommentPoints =
    isCurrentEvents &&
    availablePoints !== null &&
    commentCharacterCount > availablePoints;

  return (
    <section className="mt-6 grid gap-5 border-t border-[#1d7f12] pt-5">
      {isCurrentEvents ? (
        <div className="grid gap-6">
          <CurrentEventRatingScale
            title="truth vote"
            labels={["Fallacious", "Biased", "Factual"]}
            value={truthScore}
            savedValue={truthSummary.userScore}
            voteCount={truthSummary.voteCount}
            disabled={!isLoggedIn || isLoading || isVoting}
            saving={votingDimension === "truth"}
            onChange={setTruthScore}
            onVote={() => saveTruthVote("truth")}
          />
          <CurrentEventRatingScale
            title="relevance / importance"
            labels={["Unnecessary", "Good to know", "Crucial knowledge"]}
            value={relevanceScore}
            savedValue={truthSummary.relevance?.userScore ?? null}
            voteCount={truthSummary.relevance?.voteCount ?? 0}
            disabled={!isLoggedIn || isLoading || isVoting}
            saving={votingDimension === "relevance"}
            onChange={setRelevanceScore}
            onVote={() => saveTruthVote("relevance")}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="bay-terminal-copy text-xs text-[#7f9f78]">
                truth vote
              </h3>
              <p className="bay-terminal-copy mt-2 text-sm text-[#d7ffd0]">
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
            onClick={() => saveTruthVote()}
            className="bay-terminal-copy w-fit border border-[#39ff14] px-3 py-2 text-xs text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:cursor-not-allowed disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent disabled:hover:text-[#7f9f78]"
          >
            {isVoting ? "saving" : voteButtonLabel}
          </button>
        </div>
      )}

      <div className="grid gap-3">
        <h3 className="bay-terminal-copy text-xs text-[#7f9f78]">
          comments
        </h3>
        {isLoading ? (
          <p className="bay-terminal-copy text-xs text-[#7f9f78]">
            loading
          </p>
        ) : comments.length ? (
          <div className="grid max-h-72 gap-3 overflow-y-auto pr-2">
            {comments.map((comment) => (
              <article
                key={comment.id}
                className="relative border border-[#1d7f12] bg-black px-3 py-3 pr-11"
              >
                {postCategory === "theory" &&
                now - new Date(comment.createdAt).getTime() <
                publicCommentDeleteWindowMs ? (
                  <button
                    type="button"
                    onClick={() => deleteComment(comment.id)}
                    disabled={deletingCommentIds.includes(comment.id)}
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border border-[#ff5f66]/70 bg-[#240708]/80 text-sm font-black leading-none text-[#ff7379] shadow-[0_0_10px_rgba(255,95,102,0.2)] transition hover:border-[#ff7379] hover:bg-[#ff5f66] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9f] disabled:cursor-wait disabled:opacity-50"
                    aria-label="Delete this comment before its two-minute window closes"
                    title="Anyone can erase this comment for two minutes"
                  >
                    ×
                  </button>
                ) : null}
                <p className="bay-terminal-copy text-[0.68rem] text-[#7f9f78]">
                  {comment.authorName ||
                    (comment.author === "anonymous"
                      ? "anonymous user"
                      : `member ${comment.author}`)} /{" "}
                  {hasActiveCard(comment, "hero-card") ? (
                    <span className="text-[#ffd84a]">★★★★★ / </span>
                  ) : null}
                  {postCategory === "library-submission" &&
                  hasActiveCard(comment, "library-card") ? (
                    <span className="text-[#d7ffd0]">LIBRARY CARD / </span>
                  ) : null}
                  {formatTimestamp(comment.createdAt)}
                </p>
                <p
                  className={`bay-terminal-field mt-2 whitespace-pre-wrap text-sm leading-6 ${
                    hasActiveCard(comment, "empath-card")
                      ? "text-[#6f5cff]"
                      : "text-[#d7ffd0]"
                  }`}
                >
                  {comment.body}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="bay-terminal-copy text-xs text-[#7f9f78]">
            no comments
          </p>
        )}

        <form onSubmit={saveComment} className="grid gap-3">
          <textarea
            value={commentBody}
            onChange={(event) => setCommentBody(limitCharacters(event.target.value))}
            rows={3}
            disabled={commentRequiresLogin}
            className="bay-terminal-field min-h-24 resize-y border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm leading-6 text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
            placeholder={
              commentRequiresLogin
                ? "sign in to comment on Current Events"
                : isLoggedIn
                  ? "comment"
                  : "comment anonymously"
            }
            aria-label="Comment"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="bay-terminal-copy text-[0.68rem] text-[#7f9f78]">
              {commentCharacterCount}/{commentCharacterLimit} characters
            </p>
            {isCurrentEvents ? (
              <p className="bay-terminal-copy text-[0.68rem] text-[#b6d88f]">
                cost: {commentCharacterCount} points / 1 per character
                {availablePoints !== null
                  ? ` / ${availablePoints} available`
                  : ""}
              </p>
            ) : (
              <p className="bay-terminal-copy text-[0.68rem] text-[#7f9f78]">
                free / two-minute public delete window
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={
              isCommentSaving || !commentBody.trim() || commentRequiresLogin
              || lacksCommentPoints
            }
            className="bay-terminal-copy w-fit border border-[#39ff14] px-3 py-2 text-xs text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:cursor-not-allowed disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent disabled:hover:text-[#7f9f78]"
          >
            {isCommentSaving
              ? "saving"
              : isCurrentEvents
                ? `post comment / ${commentCharacterCount} points`
                : "post comment / free"}
          </button>
        </form>
        {lacksCommentPoints ? (
          <p className="bay-terminal-copy text-xs text-[#ff7379]">
            shorten the comment or earn more points before posting
          </p>
        ) : null}
        {commentRequiresLogin ? (
          <p className="bay-terminal-copy text-xs text-[#7f9f78]">
            Current Events comments require a member account because each
            character spends one available point. {" "}
            <Link
              href="/join-the-circle"
              className="text-[#39ff14] underline decoration-[#39ff14] underline-offset-4"
            >
              join the circle
            </Link>
          </p>
        ) : !isLoggedIn ? (
          <p className="bay-terminal-copy text-xs text-[#7f9f78]">
            posting as anonymous user /{" "}
            <Link
              href="/join-the-circle"
              className="text-[#39ff14] underline decoration-[#39ff14] underline-offset-4"
            >
              make an account
            </Link>{" "}
            to attach your name and vote
          </p>
        ) : null}

        {errorMessage ? (
          <p className="bay-terminal-copy text-xs text-[#39ff14]">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
