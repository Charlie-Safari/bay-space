"use client";

import { useEffect, useRef, useState } from "react";
import FavoriteAuthorButton from "../../components/favorite-author-button";

type PublicIdCardProps = {
  favoriteAuthorId: string;
  isBayoClubMember: boolean;
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
      className="w-full border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]"
    >
      <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
        ID card
      </summary>
      <div className="mt-5 grid gap-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
        <p>EXPLORER NUMBER - #{member.member}</p>
        <p>TITLE: {member.title}</p>
        <p>NAME: {member.name}{isBayoClubMember ? " 🦉" : ""}</p>
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
    </details>
  );
}
