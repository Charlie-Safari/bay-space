"use client";

import { useEffect, useState } from "react";
import {
  favoriteStoreEvent,
  getActiveMemberId,
  isFavoriteAuthor,
  toggleFavoriteAuthor,
} from "./favorite-store";

type FavoriteAuthorButtonProps = {
  authorId: string;
};

export default function FavoriteAuthorButton({
  authorId,
}: FavoriteAuthorButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncFavoriteAuthor() {
      const activeMemberId = await getActiveMemberId();
      const favorite =
        activeMemberId && activeMemberId !== authorId
          ? await isFavoriteAuthor(authorId)
          : false;

      if (!isMounted) {
        return;
      }

      setIsLoggedIn(Boolean(activeMemberId && activeMemberId !== authorId));
      setIsFavorite(favorite);
    }

    syncFavoriteAuthor();
    window.addEventListener("storage", syncFavoriteAuthor);
    window.addEventListener("bay-space-auth", syncFavoriteAuthor);
    window.addEventListener(favoriteStoreEvent, syncFavoriteAuthor);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncFavoriteAuthor);
      window.removeEventListener("bay-space-auth", syncFavoriteAuthor);
      window.removeEventListener(favoriteStoreEvent, syncFavoriteAuthor);
    };
  }, [authorId]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async () =>
        setIsFavorite(await toggleFavoriteAuthor(authorId))
      }
      className={`mt-6 w-fit border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
        isFavorite
          ? "border-[#39ff14] bg-[#39ff14] text-black"
          : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
      }`}
      aria-pressed={isFavorite}
    >
      {isFavorite ? "author favorited" : "favorite this author"}
    </button>
  );
}
