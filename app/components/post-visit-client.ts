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

export async function recordPostVisit(postId: string) {
  if (!claimPostVisit(postId)) {
    return null;
  }

  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/visit`, {
    method: "POST",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json().catch(() => null)) as {
    postVisits?: number;
  } | null;

  return typeof data?.postVisits === "number" ? data.postVisits : null;
}
