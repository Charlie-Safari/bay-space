"use client";

const recentPostVisits = new Map<string, number>();
const duplicateVisitWindowMs = 2000;

export function claimPostVisit(postId: string) {
  const now = Date.now();
  const previousVisitAt = recentPostVisits.get(postId) ?? 0;

  if (now - previousVisitAt < duplicateVisitWindowMs) {
    return false;
  }

  recentPostVisits.set(postId, now);
  return true;
}
