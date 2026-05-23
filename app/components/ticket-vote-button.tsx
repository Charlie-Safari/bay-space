"use client";

import { useEffect, useState } from "react";
import {
  getTicketVoteAvailability,
  setNextTicketVoteAt,
  startTicketVoteCooldown,
  ticketVoteStoreEvent,
} from "./ticket-vote-store";

type TicketVoteButtonProps = {
  initialCount?: number;
  postId: string;
};

export default function TicketVoteButton({
  initialCount = 0,
  postId,
}: TicketVoteButtonProps) {
  const [canVote, setCanVote] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function syncAvailability() {
      setCanVote(getTicketVoteAvailability().canVote);
    }

    async function syncAccountAvailability() {
      const response = await fetch("/api/ticket-vote", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        member?: string;
        nextAt?: number;
      };

      if (typeof data.nextAt === "number") {
        setNextTicketVoteAt(data.nextAt, data.member);
        setCanVote(getTicketVoteAvailability(Date.now(), data.member).canVote);
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
  }, []);

  async function voteTicket() {
    if (!canVote || isSaving) {
      return;
    }

    setIsSaving(true);
    const response = await fetch(`/api/posts/${postId}/ticket`, {
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as {
      nextTicketVoteAt?: number;
      member?: string;
      ticketVotes?: number;
    };
    setIsSaving(false);

    if (!response.ok && typeof data.nextTicketVoteAt === "number") {
      setNextTicketVoteAt(data.nextTicketVoteAt, data.member);
      return;
    }

    if (!response.ok || typeof data.ticketVotes !== "number") {
      return;
    }

    setCount(data.ticketVotes);
    if (typeof data.nextTicketVoteAt === "number") {
      setNextTicketVoteAt(data.nextTicketVoteAt, data.member);
    } else {
      startTicketVoteCooldown(undefined, data.member);
    }
  }

  return (
    <button
      type="button"
      onClick={voteTicket}
      disabled={!canVote || isSaving}
      className={`text-xl leading-none text-[#39ff14] transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
        canVote ? "" : "cursor-not-allowed opacity-35"
      }`}
      aria-label={`Vote ticket. Total tickets ${count}`}
      title={`ticket votes: ${count}`}
    >
      🎟️
    </button>
  );
}
