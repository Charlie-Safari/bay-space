"use client";

import { useEffect, useState } from "react";
import {
  favoriteStoreEvent,
  getActiveMemberId,
  isFavoritePost,
  toggleFavoritePost,
} from "./favorite-store";

type FavoriteButtonProps = {
  onCountChange?: (count: number, isFavorite: boolean) => void;
  postId: string;
};

export default function FavoriteButton({
  onCountChange,
  postId,
}: FavoriteButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncFavorite() {
      const activeMemberId = await getActiveMemberId();
      const favorite = activeMemberId ? await isFavoritePost(postId) : false;

      if (!isMounted) {
        return;
      }

      setIsLoggedIn(Boolean(activeMemberId));
      setIsFavorite(favorite);
    }

    syncFavorite();
    window.addEventListener("storage", syncFavorite);
    window.addEventListener("bay-space-auth", syncFavorite);
    window.addEventListener(favoriteStoreEvent, syncFavorite);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncFavorite);
      window.removeEventListener("bay-space-auth", syncFavorite);
      window.removeEventListener(favoriteStoreEvent, syncFavorite);
    };
  }, [postId]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        const result = await toggleFavoritePost(postId);

        setIsFavorite(result.saved);
        onCountChange?.(result.count, result.saved);
      }}
      className={`favorite-diamond text-xl leading-none text-[#39ff14] transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
        isFavorite ? "favorite-diamond-active" : "opacity-55"
      }`}
      aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
      aria-pressed={isFavorite}
    >
      ◆
    </button>
  );
}
