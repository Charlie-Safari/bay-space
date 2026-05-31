"use client";

import { useEffect, useState } from "react";
import {
  cryptiTicketVoteCooldownMs,
  cryptiTicketVoteCooldownStoragePrefix,
  getTicketVoteAvailability,
  setNextTicketVoteAt,
  startTicketVoteCooldown,
  ticketVoteStoreEvent,
} from "./ticket-vote-store";

type TicketVoteButtonProps = {
  availabilityPath?: string;
  cooldownMs?: number;
  cooldownStoragePrefix?: string;
  initialCount?: number;
  isActive?: boolean;
  onCountChange?: (count: number, isActive: boolean) => void;
  postId: string;
  votePath?: string;
};

export default function TicketVoteButton({
  availabilityPath = "/api/ticket-vote",
  cooldownMs,
  cooldownStoragePrefix,
  initialCount = 0,
  isActive = false,
  onCountChange,
  postId,
  votePath,
}: TicketVoteButtonProps) {
  const resolvedCooldownMs = cooldownMs ?? 4 * 60 * 60 * 1000;
  const resolvedCooldownStoragePrefix = cooldownStoragePrefix ?? undefined;
  const [canVote, setCanVote] = useState(false);
  const [countOverride, setCountOverride] = useState<number | null>(null);
  const [ticketedOverride, setTicketedOverride] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const count = countOverride ?? initialCount;
  const isTicketed = ticketedOverride ?? isActive;

  useEffect(() => {
    function syncAvailability() {
      setCanVote(
        isTicketed ||
          getTicketVoteAvailability(
            Date.now(),
            undefined,
            resolvedCooldownStoragePrefix,
          ).canVote,
      );
    }

    async function syncAccountAvailability() {
      const response = await fetch(availabilityPath, { cache: "no-store" });

      if (!response.ok) {
        if (response.status === 401) {
          setCanVote(false);
        }
        return;
      }

      const data = (await response.json()) as {
        member?: string;
        nextAt?: number;
        postIds?: string[];
      };

      if (typeof data.nextAt === "number") {
        if (Array.isArray(data.postIds)) {
          setTicketedOverride(data.postIds.includes(postId));
        }
        setNextTicketVoteAt(
          data.nextAt,
          data.member,
          resolvedCooldownStoragePrefix,
        );
        setCanVote(
          isTicketed ||
            getTicketVoteAvailability(
              Date.now(),
              data.member,
              resolvedCooldownStoragePrefix,
            ).canVote,
        );
      }
    }

    syncAvailability();
    syncAccountAvailability();
    window.addEventListener("storage", syncAvailability);
    window.addEventListener(ticketVoteStoreEvent, syncAvailability);

    return () => {
      window.removeEventListener("storage", syncAvailability);
      window.removeEventListener(ticketVoteStoreEvent, syncAvailability);
    };
  }, [availabilityPath, isTicketed, postId, resolvedCooldownStoragePrefix]);

  async function voteTicket() {
    if (!canVote || isSaving) {
      return;
    }

    setIsSaving(true);
    const response = await fetch(votePath ?? `/api/posts/${postId}/ticket`, {
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as {
      nextTicketVoteAt?: number;
      member?: string;
      ticketed?: boolean;
      ticketVotes?: number;
    };
    setIsSaving(false);

    if (!response.ok && typeof data.nextTicketVoteAt === "number") {
      setNextTicketVoteAt(
        data.nextTicketVoteAt,
        data.member,
        resolvedCooldownStoragePrefix,
      );
      return;
    }

    if (!response.ok || typeof data.ticketVotes !== "number") {
      return;
    }

    setCountOverride(data.ticketVotes);
    setTicketedOverride(Boolean(data.ticketed));
    onCountChange?.(data.ticketVotes, Boolean(data.ticketed));
    if (typeof data.nextTicketVoteAt === "number") {
      setNextTicketVoteAt(
        data.nextTicketVoteAt,
        data.member,
        resolvedCooldownStoragePrefix,
      );
    } else {
      startTicketVoteCooldown(
        undefined,
        data.member,
        resolvedCooldownMs,
        resolvedCooldownStoragePrefix,
      );
    }
  }

  return (
    <button
      type="button"
      onClick={voteTicket}
      disabled={(!canVote && !isTicketed) || isSaving}
      className={`text-xl leading-none text-[#39ff14] transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
        isTicketed
          ? "drop-shadow-[0_0_10px_rgba(57,255,20,0.9)]"
          : canVote
            ? ""
            : "cursor-not-allowed opacity-35"
      }`}
      aria-label={`${isTicketed ? "Remove" : "Vote"} ticket. Total tickets ${count}`}
      aria-pressed={isTicketed}
      title={`ticket votes: ${count}`}
    >
      🎟️
    </button>
  );
}

export const cryptiTicketVoteButtonDefaults = {
  cooldownMs: cryptiTicketVoteCooldownMs,
  cooldownStoragePrefix: cryptiTicketVoteCooldownStoragePrefix,
};
