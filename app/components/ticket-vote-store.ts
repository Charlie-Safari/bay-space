"use client";

export const ticketVoteStoreEvent = "bay-space-ticket-vote";
const activeMemberStorageKey = "bay-space-active-member";
const ticketVoteCooldownStoragePrefix = "bay-space-ticket-vote-next-at";
export const ticketVoteCooldownMs = 4 * 60 * 60 * 1000;

export type TicketVoteAvailability = {
  canVote: boolean;
  remainingMs: number;
};

function getActiveMemberId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(activeMemberStorageKey) ?? "";
}

function getTicketVoteCooldownStorageKey(memberId = getActiveMemberId()) {
  return memberId
    ? `${ticketVoteCooldownStoragePrefix}:${memberId}`
    : ticketVoteCooldownStoragePrefix;
}

export function getNextTicketVoteAt(memberId?: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const nextAt = Number(
    window.localStorage.getItem(getTicketVoteCooldownStorageKey(memberId)) ?? "0",
  );

  return Number.isFinite(nextAt) ? nextAt : 0;
}

export function getTicketVoteAvailability(now = Date.now(), memberId?: string) {
  const nextAt = getNextTicketVoteAt(memberId);

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

export function setNextTicketVoteAt(nextAt: number, memberId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getTicketVoteCooldownStorageKey(memberId),
    String(nextAt),
  );
  window.dispatchEvent(new Event(ticketVoteStoreEvent));
}

export function startTicketVoteCooldown(now = Date.now(), memberId?: string) {
  setNextTicketVoteAt(now + ticketVoteCooldownMs, memberId);
}
