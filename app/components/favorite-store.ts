"use client";

export const favoriteStoreEvent = "bay-space-favorites";
const favoriteAuthorsStoragePrefix = "bay-space-favorite-authors";

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
    return { count: 0, saved: false };
  }

  const data = (await response.json()) as { count?: number; saved?: boolean };

  window.dispatchEvent(new Event(favoriteStoreEvent));

  return {
    count: typeof data.count === "number" ? data.count : 0,
    saved: Boolean(data.saved),
  };
}

function getFavoriteAuthorsStorageKey(memberId: string) {
  return `${favoriteAuthorsStoragePrefix}:${memberId}`;
}

export async function getFavoriteAuthorIds() {
  const activeMemberId = await getActiveMemberId();

  if (!activeMemberId) {
    return [];
  }

  return getFavoriteAuthorIdsForMember(activeMemberId);
}

export function getFavoriteAuthorIdsForMember(memberId: string) {
  if (!memberId) {
    return [];
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(getFavoriteAuthorsStorageKey(memberId)) ??
        "[]",
    ) as string[];
  } catch {
    return [];
  }
}

export async function isFavoriteAuthor(authorId: string) {
  return (await getFavoriteAuthorIds()).includes(authorId);
}

export async function toggleFavoriteAuthor(authorId: string) {
  const activeMemberId = await getActiveMemberId();

  if (!activeMemberId || activeMemberId === authorId) {
    return false;
  }

  const favoriteAuthorIds = await getFavoriteAuthorIds();
  const isFavorite = favoriteAuthorIds.includes(authorId);
  const nextFavoriteAuthorIds = isFavorite
    ? favoriteAuthorIds.filter((favoriteAuthorId) => favoriteAuthorId !== authorId)
    : [...favoriteAuthorIds, authorId];

  window.localStorage.setItem(
    getFavoriteAuthorsStorageKey(activeMemberId),
    JSON.stringify(nextFavoriteAuthorIds),
  );
  window.dispatchEvent(new Event(favoriteStoreEvent));

  return !isFavorite;
}
