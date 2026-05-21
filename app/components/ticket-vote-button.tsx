"use client";

import { useEffect, useState } from "react";
import {
  getTicketVoteAvailability,
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

    syncAvailability();
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
    const data = response.ok
      ? ((await response.json()) as { ticketVotes?: number })
      : {};
    setIsSaving(false);

    if (!response.ok || typeof data.ticketVotes !== "number") {
      return;
    }

    setCount(data.ticketVotes);
    startTicketVoteCooldown();
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
