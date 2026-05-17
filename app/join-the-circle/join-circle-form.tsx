"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isValidUsername,
  normalizeUsername,
} from "../../lib/bay-space-username";

export default function JoinCircleForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const canAutoFocusRef = useRef(false);
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUsernameBlocked, setIsUsernameBlocked] = useState(false);

  useEffect(() => {
    canAutoFocusRef.current = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    if (canAutoFocusRef.current) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  function focusInput() {
    inputRef.current?.focus({ preventScroll: true });
  }

  function focusInputForError() {
    if (canAutoFocusRef.current || document.activeElement === inputRef.current) {
      focusInput();
    }
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUsername = normalizeUsername(username);

    if (!isValidUsername(cleanUsername) || isSubmitting) {
      setErrorMessage("username unavailable");
      setIsUsernameBlocked(true);
      focusInputForError();
      return;
    }

    setErrorMessage("");
    setIsUsernameBlocked(false);
    setIsSubmitting(true);

    let data: { member?: string; message?: string } = {};
    let isAvailable = false;

    try {
      const availabilityResponse = await fetch(
        `/api/members?username=${encodeURIComponent(cleanUsername)}`,
        { cache: "no-store" },
      );
      const availabilityData = (await availabilityResponse.json()) as {
        available?: boolean;
      };

      if (!availabilityResponse.ok || !availabilityData.available) {
        data = { message: "username unavailable" };
        setErrorMessage("username unavailable");
        setIsUsernameBlocked(true);
        return;
      }

      const response = await fetch("/api/members?next=true", {
        cache: "no-store",
      });

      data = (await response.json()) as {
        member?: string;
        message?: string;
      };
      isAvailable = response.ok && Boolean(data.member);
    } catch {
      data = { message: "activation network unavailable" };
    } finally {
      setIsSubmitting(false);
    }

    if (!isAvailable || !data.member) {
      setErrorMessage(data.message ?? "activation unavailable");
      focusInputForError();
      return;
    }

    router.push(
      `/join-the-circle/member?name=${encodeURIComponent(
        cleanUsername,
      )}&member=${data.member}&ref=${encodeURIComponent(cleanUsername)}`,
    );
  }

  return (
    <form
      onSubmit={activate}
      className="mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-3 font-[Courier_New,Courier,monospace] shadow-[0_0_18px_rgba(57,255,20,0.18)]"
      aria-label="Create your user name"
    >
      <label
        htmlFor="circle-username"
        className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[#d7ffd0]"
      >
        Create your user name
      </label>
      <div
        onPointerDown={focusInput}
        onAnimationEnd={() => setIsUsernameBlocked(false)}
        className={`flex items-center gap-2 border border-[#1d7f12] bg-[#001100] px-2 py-2 shadow-[inset_0_0_12px_rgba(57,255,20,0.14)] ${
          isUsernameBlocked ? "animate-[option-shake_180ms_linear]" : ""
        }`}
      >
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
            autoCapitalize="none"
            inputMode="text"
            maxLength={30}
            spellCheck={false}
            value={username}
            onChange={(event) => {
              setUsername(normalizeUsername(event.target.value));
              setErrorMessage("");
              setIsUsernameBlocked(false);
            }}
            className="absolute inset-0 w-full bg-transparent text-3xl font-black leading-none tracking-[0.12em] text-transparent caret-transparent outline-none"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 min-h-11 w-full touch-manipulation border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        {isSubmitting ? "activating" : "activate"}
      </button>
      <p className="mt-3 border-l border-[#39ff14] pl-3 text-[0.68rem] font-bold leading-5 tracking-[0.14em] text-[#7f9f78]">
        a-z
        <br />
        0-9
        <br />
        (-)
      </p>
      {errorMessage ? (
        <p className="mt-3 text-[0.68rem] font-black leading-5 tracking-[0.14em] text-[#39ff14]">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
