"use client";

export const ticketVoteStoreEvent = "bay-space-ticket-vote";
const ticketVoteCooldownStorageKey = "bay-space-ticket-vote-next-at";
export const ticketVoteCooldownMs = 4 * 60 * 60 * 1000;

export type TicketVoteAvailability = {
  canVote: boolean;
  remainingMs: number;
};

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

export function formatTicketVoteRemainingTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => unit.toString().padStart(2, "0"))
    .join(":");
}

export function setNextTicketVoteAt(nextAt: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ticketVoteCooldownStorageKey, String(nextAt));
  window.dispatchEvent(new Event(ticketVoteStoreEvent));
}

export function startTicketVoteCooldown(now = Date.now()) {
  setNextTicketVoteAt(now + ticketVoteCooldownMs);
}
