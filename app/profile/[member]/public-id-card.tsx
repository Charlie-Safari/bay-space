"use client";

import { useEffect, useRef, useState } from "react";
import FavoriteAuthorButton from "../../components/favorite-author-button";

type PublicIdCardProps = {
  favoriteAuthorId: string;
  isBayoClubMember: boolean;
  isCryptiMember: boolean;
  links: {
    href: string;
    label: string;
  }[];
  member: {
    member: string;
    name: string;
    refName: string;
    title: string;
  };
};

export default function PublicIdCard({
  favoriteAuthorId,
  isBayoClubMember,
  isCryptiMember,
  links,
  member,
}: PublicIdCardProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        detailsRef.current &&
        !detailsRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isOpen]);

  return (
    <details
      ref={detailsRef}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group w-full border-2 border-[#39ff14] bg-black shadow-[0_0_18px_rgba(57,255,20,0.18)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0] transition hover:bg-[#001100] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d7ffd0] [&::-webkit-details-marker]:hidden">
        <span>ID card</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#39ff14] transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="border-t border-[#1d7f12] p-4">
        <div className="grid gap-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
          <p>EXPLORER NUMBER - #{member.member}</p>
          <p>TITLE: {member.title}</p>
          <p>
            NAME: {member.name}
            {isCryptiMember ? " +" : isBayoClubMember ? " 🦉" : ""}
          </p>
          <p>(REFERENCE NAME): {member.refName || "-----"}</p>
        </div>
        {links.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
              >
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
        <FavoriteAuthorButton authorId={favoriteAuthorId} />
      </div>
    </details>
  );
}
