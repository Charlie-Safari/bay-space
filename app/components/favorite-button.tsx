"use client";

import { useEffect, useState } from "react";
import {
  favoriteStoreEvent,
  getActiveMemberId,
  isFavoritePost,
  toggleFavoritePost,
} from "./favorite-store";

type FavoriteButtonProps = {
  postId: string;
};

export default function FavoriteButton({ postId }: FavoriteButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    function syncFavorite() {
      const activeMemberId = getActiveMemberId();

      setIsLoggedIn(Boolean(activeMemberId));
      setIsFavorite(isFavoritePost(postId, activeMemberId));
    }

    syncFavorite();
    window.addEventListener("storage", syncFavorite);
    window.addEventListener("bay-space-auth", syncFavorite);
    window.addEventListener(favoriteStoreEvent, syncFavorite);

    return () => {
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
      onClick={() => setIsFavorite(toggleFavoritePost(postId))}
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
