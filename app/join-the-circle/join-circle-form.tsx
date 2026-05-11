"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const memberCounterKey = "bay-space-circle-next-member-v6";

function formatMemberId(value: number) {
  return value.toString().padStart(3, "0");
}

function normalizeUsername(value: string) {
  return value.replace(/[^a-z0-9 _-]/gi, "").slice(0, 24);
}

export default function JoinCircleForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      inputRef.current?.focus();
      return;
    }

    const nextMember = Number(
      window.localStorage.getItem(memberCounterKey) ?? "1",
    );
    const memberId = formatMemberId(nextMember);

    router.push(
      `/join-the-circle/member?name=${encodeURIComponent(
        cleanUsername,
      )}&member=${memberId}`,
    );
  }

  return (
    <form
      onSubmit={activate}
      onPointerDown={() => inputRef.current?.focus()}
      className="mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-3 font-[Courier_New,Courier,monospace] shadow-[0_0_18px_rgba(57,255,20,0.18)]"
      aria-label="Create your user name"
    >
      <label
        htmlFor="circle-username"
        className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[#d7ffd0]"
      >
        Create your user name
      </label>
      <div className="flex items-center gap-2 border border-[#1d7f12] bg-[#001100] px-2 py-2 shadow-[inset_0_0_12px_rgba(57,255,20,0.14)]">
        <span
          className="text-3xl font-black leading-none text-[#39ff14]"
          aria-hidden="true"
        >
          C&gt;
        </span>
        <div className="relative min-h-9 flex-1">
          <div
            className="pointer-events-none absolute inset-0 flex items-center text-3xl font-black leading-none tracking-[0.12em] text-[#39ff14] [text-shadow:0_0_10px_#39ff14]"
            aria-hidden="true"
          >
            <span>{username}</span>
            <span className="ml-1 h-8 w-5 animate-pulse bg-[#39ff14] shadow-[0_0_10px_#39ff14]" />
          </div>
          <input
            ref={inputRef}
            id="circle-username"
            autoComplete="off"
            maxLength={24}
            value={username}
            onChange={(event) =>
              setUsername(normalizeUsername(event.target.value))
            }
            className="absolute inset-0 w-full bg-transparent text-3xl font-black leading-none tracking-[0.12em] text-transparent caret-transparent outline-none"
          />
        </div>
      </div>
      <button
        type="submit"
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        activate
      </button>
    </form>
  );
}
