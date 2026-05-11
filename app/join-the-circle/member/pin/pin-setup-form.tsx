"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PinSetupFormProps = {
  initialPin: string;
  initialRef: string;
  member: string;
  name: string;
  roles: string;
  title: string;
};

const creatorRoles = [
  "creator/ influencer - news",
  "creator/ influencer - conspiracy",
];

export default function PinSetupForm({
  initialPin,
  initialRef,
  member,
  name,
  roles,
  title,
}: PinSetupFormProps) {
  const router = useRouter();
  const [pin, setPin] = useState(initialPin);
  const [shortRef, setShortRef] = useState(initialRef);
  const selectedRoles = roles.split(",").filter(Boolean);
  const needsCreatorCode = selectedRoles.some((role) =>
    creatorRoles.includes(role),
  );

  function saveIntel() {
    if (!pin.trim()) {
      return;
    }

    const nextPath = needsCreatorCode
      ? "/join-the-circle/member/creator-code"
      : "/join-the-circle/member/report";
    const query = new URLSearchParams({
      member,
      name,
      pin,
      ref: shortRef,
      roles,
      title,
    });

    router.push(`${nextPath}?${query.toString()}`);
  }

  return (
    <form className="mt-8 grid gap-5" onSubmit={(event) => event.preventDefault()}>
      <label className="grid gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
        Please chose a password:
        <input
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value.slice(0, 24))}
          className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
        />
      </label>
      <label className="grid gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
        Optional (5 digit short reference name):
        <input
          value={shortRef}
          onChange={(event) =>
            setShortRef(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 5))
          }
          placeholder="_ _ _ _ _"
          className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black uppercase tracking-[0.34em] text-[#39ff14] outline-none placeholder:text-[#1d7f12] focus:ring-2 focus:ring-[#39ff14]"
        />
      </label>
      <button
        type="button"
        onClick={saveIntel}
        className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        save
      </button>
    </form>
  );
}
