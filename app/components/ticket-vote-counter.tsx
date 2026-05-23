"use client";

import { useEffect, useState } from "react";
import {
  formatTicketVoteRemainingTime,
  getTicketVoteAvailability,
  setNextTicketVoteAt,
  ticketVoteStoreEvent,
} from "./ticket-vote-store";

export default function TicketVoteCounter() {
  const [ticketVoteAvailability, setTicketVoteAvailability] = useState(
    getTicketVoteAvailability,
  );

  useEffect(() => {
    function syncTicketVotes() {
      setTicketVoteAvailability(getTicketVoteAvailability());
    }

    async function syncAccountTicketVotes() {
      const response = await fetch("/api/ticket-vote", { cache: "no-store" });

      if (!response.ok) {
        syncTicketVotes();
        return;
      }

      const data = (await response.json()) as {
        member?: string;
        nextAt?: number;
      };

      if (typeof data.nextAt === "number") {
        setNextTicketVoteAt(data.nextAt, data.member);
        setTicketVoteAvailability(
          getTicketVoteAvailability(Date.now(), data.member),
        );
      } else {
        syncTicketVotes();
      }
    }

    syncAccountTicketVotes();
    const timer = window.setInterval(syncTicketVotes, 1000);

    window.addEventListener("storage", syncTicketVotes);
    window.addEventListener(ticketVoteStoreEvent, syncTicketVotes);
    window.addEventListener("bay-space-auth", syncAccountTicketVotes);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", syncTicketVotes);
      window.removeEventListener(ticketVoteStoreEvent, syncTicketVotes);
      window.removeEventListener("bay-space-auth", syncAccountTicketVotes);
    };
  }, []);

  return (
    <p
      className="mt-4 border border-[#1d7f12] bg-[#001100] px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]"
      aria-live="polite"
    >
      vote tickets 🎟️: {ticketVoteAvailability.canVote ? 1 : 0}
      {!ticketVoteAvailability.canVote ? (
        <span className="mt-2 block text-xs tracking-[0.18em] text-[#39ff14]">
          {formatTicketVoteRemainingTime(ticketVoteAvailability.remainingMs)}
        </span>
      ) : null}
    </p>
  );
}
