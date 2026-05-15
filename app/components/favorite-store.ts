"use client";

export const favoriteStoreEvent = "bay-space-favorites";

export async function getActiveMemberId() {
  const response = await fetch("/api/me", { cache: "no-store" });

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as {
    member?: { member: string } | null;
  };

  return data.member?.member ?? "";
}

export async function getFavoritePostIds() {
  const response = await fetch("/api/saved-posts", { cache: "no-store" });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { postIds?: string[] };

  return data.postIds ?? [];
}

export async function isFavoritePost(postId: string) {
  return (await getFavoritePostIds()).includes(postId);
}

export async function countFavoritePosts(postIds: string[]) {
  if (!postIds.length) {
    return {};
  }

  const response = await fetch(
    `/api/saved-posts?counts=true&ids=${encodeURIComponent(postIds.join(","))}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return {};
  }

  const data = (await response.json()) as {
    counts?: Record<string, number>;
  };

  return data.counts ?? {};
}

export async function toggleFavoritePost(postId: string) {
  const response = await fetch("/api/saved-posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ postId }),
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { saved?: boolean };

  window.dispatchEvent(new Event(favoriteStoreEvent));

  return Boolean(data.saved);
}
