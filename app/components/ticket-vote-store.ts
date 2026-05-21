"use client";

export const ticketVoteStoreEvent = "bay-space-ticket-vote";
const ticketVoteCooldownStorageKey = "bay-space-ticket-vote-next-at";
export const ticketVoteCooldownMs = 4 * 60 * 60 * 1000;

export function getNextTicketVoteAt() {
  if (typeof window === "undefined") {
    return 0;
  }

  const nextAt = Number(
    window.localStorage.getItem(ticketVoteCooldownStorageKey) ?? "0",
  );

  return Number.isFinite(nextAt) ? nextAt : 0;
}

export function getTicketVoteAvailability(now = Date.now()) {
  const nextAt = getNextTicketVoteAt();

  return {
    canVote: !nextAt || nextAt <= now,
    remainingMs: Math.max(0, nextAt - now),
  };
}

export function startTicketVoteCooldown(now = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ticketVoteCooldownStorageKey,
    String(now + ticketVoteCooldownMs),
  );
  window.dispatchEvent(new Event(ticketVoteStoreEvent));
}
