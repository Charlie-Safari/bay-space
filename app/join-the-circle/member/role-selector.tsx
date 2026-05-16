"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = [
  "curious reader",
  "ghost author - news",
  "ghost author - conspiracy",
  "creator/ influencer - news",
  "creator/ influencer - conspiracy",
];

function getRoleAccess(role: string) {
  if (role === "curious reader") {
    return "read only";
  }

  if (role.startsWith("ghost author")) {
    return "Post: daily food, theories, library";
  }

  return "Post: top story, daily food, theories, library";
}

type RoleSelectorProps = {
  member: string;
  name: string;
  refName: string;
};

export default function RoleSelector({ member, name, refName }: RoleSelectorProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("");

  function toggleRole(role: string) {
    setSelectedRole((currentRole) => (currentRole === role ? "" : role));
  }

  function goNext() {
    router.push(
      `/join-the-circle/member/next?name=${encodeURIComponent(
        name,
      )}&member=${member}&ref=${encodeURIComponent(
        refName,
      )}&roles=${encodeURIComponent(selectedRole)}`,
    );
  }

  function goBack() {
    startOver();
  }

  function startOver() {
    router.push("/join-the-circle");
  }

  return (
    <div className="mt-10 w-full max-w-2xl">
      <section className="border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            select signal
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              next
            </button>
          </div>
        </div>
        <div className="grid gap-3">
          {roles.map((role) => {
            const isSelected = selectedRole === role;

            return (
              <label
                key={role}
                className="grid cursor-pointer gap-2 border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#d7ffd0] transition has-checked:border-[#39ff14] has-checked:bg-[#39ff14] has-checked:text-black"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="account-signal"
                    checked={isSelected}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 accent-[#39ff14]"
                  />
                  <span>{role}</span>
                </span>
                {isSelected ? (
                  <span className="pl-7 text-xs tracking-[0.14em] text-[#7f9f78]">
                    {getRoleAccess(role)}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={goBack}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            next
          </button>
        </div>
      </section>
      <button
        type="button"
        onClick={startOver}
        className="mt-8 w-full border border-[#ff3b3b] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
      >
        start over
      </button>
    </div>
  );
}
