"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  circleStoreEvent,
  followPersonalCircle,
  getActiveMember,
  isFollowingPersonalCircle,
} from "../../components/circle-store";
import {
  favoriteStoreEvent,
  getFavoriteAuthorIdsForMember,
  toggleFavoriteAuthor,
} from "../../components/favorite-store";

type ProfileQuickActionsProps = {
  member: {
    member: string;
    name: string;
  };
};

type ActiveProfileMember = {
  member: string;
  name: string;
};

function getActionClass(isActive = false) {
  return `inline-flex min-h-10 items-center justify-center border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
    isActive
      ? "border-[#39ff14] bg-[#39ff14] text-black shadow-[0_0_16px_rgba(57,255,20,0.35)]"
      : "border-[#39ff14]/45 bg-black/70 text-[#39ff14]/85 hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.28)]"
  }`;
}

export default function ProfileQuickActions({
  member,
}: ProfileQuickActionsProps) {
  const [activeMember, setActiveMember] =
    useState<ActiveProfileMember | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncActions() {
      const nextActiveMember = await getActiveMember();
      const canAct =
        Boolean(nextActiveMember?.member) &&
        nextActiveMember?.member !== member.member;
      const actionMember =
        canAct && nextActiveMember
          ? {
              member: nextActiveMember.member,
              name: nextActiveMember.name,
            }
          : null;

      if (!isMounted) {
        return;
      }

      setActiveMember(actionMember);
      setIsFavorite(
        actionMember
          ? getFavoriteAuthorIdsForMember(actionMember.member).includes(
              member.member,
            )
          : false,
      );
      setIsFollowing(
        actionMember
          ? isFollowingPersonalCircle(member.member, actionMember.member)
          : false,
      );
      setHasSynced(true);
    }

    syncActions();
    window.addEventListener("storage", syncActions);
    window.addEventListener("bay-space-auth", syncActions);
    window.addEventListener(favoriteStoreEvent, syncActions);
    window.addEventListener(circleStoreEvent, syncActions);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncActions);
      window.removeEventListener("bay-space-auth", syncActions);
      window.removeEventListener(favoriteStoreEvent, syncActions);
      window.removeEventListener(circleStoreEvent, syncActions);
    };
  }, [member.member]);

  if (!hasSynced || !activeMember) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/briefing-room?panel=inbox&inboxMember=${encodeURIComponent(
          member.member,
        )}`}
        className={getActionClass()}
        aria-label={`Direct message ${member.name}`}
        title={`Direct message ${member.name}`}
      >
        ✉️
      </Link>
      <button
        type="button"
        onClick={async () =>
          setIsFavorite(await toggleFavoriteAuthor(member.member))
        }
        className={getActionClass(isFavorite)}
        aria-pressed={isFavorite}
      >
        ✨ Favorite Author
      </button>
      <button
        type="button"
        onClick={() => {
          if (!activeMember) {
            return;
          }

          const followed = followPersonalCircle(member, activeMember);
          setIsFollowing(followed);
        }}
        className={getActionClass(isFollowing)}
        aria-pressed={isFollowing}
        disabled={isFollowing}
      >
        🌐 Follow
      </button>
    </div>
  );
}
