"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeUsername(value: string) {
  return value.replace(/[^a-z0-9 _-]/gi, "").slice(0, 24);
}

export default function JoinCircleForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUsername = username.trim();

    if (!cleanUsername || isSubmitting) {
      inputRef.current?.focus();
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    const response = await fetch("/api/members?next=true", {
      cache: "no-store",
    });
    const data = (await response.json()) as {
      member?: string;
      message?: string;
    };
    setIsSubmitting(false);

    if (!response.ok || !data.member) {
      setErrorMessage(data.message ?? "activation unavailable");
      inputRef.current?.focus();
      return;
    }

    router.push(
      `/join-the-circle/member?name=${encodeURIComponent(
        cleanUsername,
      )}&member=${data.member}`,
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
        disabled={isSubmitting}
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        {isSubmitting ? "activating" : "activate"}
      </button>
      <p className="mt-3 border-l border-[#39ff14] pl-3 text-[0.68rem] font-bold uppercase leading-5 tracking-[0.14em] text-[#7f9f78]">
        member number is assigned at final save. start over or exit before
        final submission and the number stays available.
      </p>
      {errorMessage ? (
        <p className="mt-3 text-[0.68rem] font-black uppercase leading-5 tracking-[0.14em] text-[#39ff14]">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
