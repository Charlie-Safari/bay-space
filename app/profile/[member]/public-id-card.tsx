"use client";

import styles from "./profile.module.css";

import { useEffect, useRef, useState } from "react";
import FavoriteAuthorButton from "../../components/favorite-author-button";

type PublicIdCardProps = {
  favoriteAuthorId: string;
  isCryptiMember: boolean;
  links: {
    href: string;
    label: string;
  }[];
  member: {
    cryptiRank: string;
    member: string;
    rank: string;
    refName: string;
  };
};

export default function PublicIdCard({
  favoriteAuthorId,
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
      className={styles.disclosure}
    >
      <summary className={styles.summary}>
        <span>ID card</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#72c16a] transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className={styles.disclosureBody}>
        <div className="grid gap-4 text-sm font-black uppercase tracking-[0.2em] text-[#dce9d9]">
          <p>EXPLORER #{member.member}</p>
          <p>RANK: {member.rank}</p>
          {isCryptiMember ? (
            <p>+CRYPTI RANK: {member.cryptiRank || "-"}</p>
          ) : null}
          <p>CODE NAME: {member.refName || "Profile"}</p>
        </div>
        {links.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[#365d36] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#72c16a] transition hover:border-[#72c16a] hover:bg-[#72c16a]/15 hover:text-[#dce9d9]"
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
