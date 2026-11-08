"use client";

const recentPostVisits = new Map<string, number>();
const duplicateVisitWindowMs = 2000;
type PostVisit = { postVisits: number; readBy: string | null };
const articleVisits = new Map<string, Promise<PostVisit | null>>();

export function claimPostVisit(postId: string) {
  const now = Date.now();
  const previousVisitAt = recentPostVisits.get(postId) ?? 0;

  if (now - previousVisitAt < duplicateVisitWindowMs) {
    return false;
  }

  recentPostVisits.set(postId, now);
  return true;
}

export function recordArticleVisit(
  postId: string,
  { readerId, countGuestVisit = true }: { readerId?: string | null; countGuestVisit?: boolean } = {},
) {
  const key = JSON.stringify([postId, readerId ?? null]);
  const existing = articleVisits.get(key);
  if (existing) return existing;

  const path = `/api/posts/${encodeURIComponent(postId)}/visit${countGuestVisit ? "" : "?countGuestVisit=0"}`;
  const visit = fetch(path, { method: "POST" }).then(async (response) => {
    if (!response.ok) return null;
    const data = (await response.json().catch(() => null)) as {
      postVisits?: number;
      readReward?: { member?: { member?: string } } | null;
    } | null;
    if (typeof data?.postVisits !== "number") return null;
    return { postVisits: data.postVisits, readBy: data.readReward?.member?.member ?? null };
  }).catch(() => null).then((result) => {
    if (result) setTimeout(() => articleVisits.delete(key), duplicateVisitWindowMs);
    else articleVisits.delete(key);
    return result;
  });
  articleVisits.set(key, visit);
  return visit;
}

export async function recordPostVisit(postId: string) {
  return (await recordArticleVisit(postId))?.postVisits ?? null;
}
