"use client";

export const favoriteStoreEvent = "bay-space-favorites";

const activeMemberKey = "bay-space-active-member-v6";

function getFavoritesKey(memberId: string) {
  return `bay-space-favorites-v1-${memberId}`;
}

export function getActiveMemberId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(activeMemberKey) ?? "";
}

export function getFavoritePostIds(memberId = getActiveMemberId()) {
  if (typeof window === "undefined" || !memberId) {
    return [];
  }

  try {
    const savedFavorites = window.localStorage.getItem(
      getFavoritesKey(memberId),
    );

    return savedFavorites ? (JSON.parse(savedFavorites) as string[]) : [];
  } catch {
    return [];
  }
}

export function isFavoritePost(postId: string, memberId = getActiveMemberId()) {
  return getFavoritePostIds(memberId).includes(postId);
}

export function countFavoritePost(postId: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("bay-space-favorites-v1-"))
    .reduce((count, key) => {
      try {
        const favoriteIds = JSON.parse(
          window.localStorage.getItem(key) ?? "[]",
        ) as string[];

        return favoriteIds.includes(postId) ? count + 1 : count;
      } catch {
        return count;
      }
    }, 0);
}

export function toggleFavoritePost(postId: string) {
  const memberId = getActiveMemberId();

  if (!memberId) {
    return false;
  }

  const favoriteIds = getFavoritePostIds(memberId);
  const isFavorite = favoriteIds.includes(postId);
  const nextFavoriteIds = isFavorite
    ? favoriteIds.filter((favoriteId) => favoriteId !== postId)
    : [postId, ...favoriteIds];

  window.localStorage.setItem(
    getFavoritesKey(memberId),
    JSON.stringify(nextFavoriteIds),
  );
  window.dispatchEvent(new Event(favoriteStoreEvent));

  return !isFavorite;
}
