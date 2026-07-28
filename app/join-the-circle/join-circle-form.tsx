"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isValidUsername,
  normalizeUsername,
} from "../../lib/bay-space-username";

type SignupPhase = "username" | "password";

const signupPasswordStoragePrefix = "bay-space-signup-password";

export function getSignupPasswordStorageKey(member: string) {
  return `${signupPasswordStoragePrefix}:${member}`;
}

export default function JoinCircleForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const canAutoFocusRef = useRef(false);
  const [signupPhase, setSignupPhase] = useState<SignupPhase>("username");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pendingMember, setPendingMember] = useState("");
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

    if (signupPhase === "password") {
      await savePassword();
      return;
    }

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

    setUsername(cleanUsername);
    setPendingMember(data.member);
    setSignupPhase("password");
    setPassword("");
    window.requestAnimationFrame(() => {
      focusInput();
    });
  }

  async function savePassword() {
    const cleanUsername = normalizeUsername(username);

    if (!pendingMember || !cleanUsername) {
      setSignupPhase("username");
      setErrorMessage("try again");
      return;
    }

    if (!password.trim() || isSubmitting) {
      setErrorMessage("password required");
      setIsUsernameBlocked(true);
      focusInputForError();
      return;
    }

    setErrorMessage("");
    setIsUsernameBlocked(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/signup-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          member: pendingMember,
          name: cleanUsername,
          pin: password,
          refName: cleanUsername,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        nextPath?: string;
      };

      if (!response.ok || !data.nextPath) {
        setErrorMessage(data.message ?? "save failed");
        setIsUsernameBlocked(true);
        return;
      }

      window.sessionStorage.setItem(
        getSignupPasswordStorageKey(pendingMember),
        password,
      );
      setPassword("");
      router.push(data.nextPath);
    } catch {
      setErrorMessage("save failed");
      setIsUsernameBlocked(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={activate}
      className="mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-3 font-[Courier_New,Courier,monospace] shadow-[0_0_18px_rgba(57,255,20,0.18)]"
      aria-label="Create your user name"
    >
      <label
        htmlFor="circle-username"
        className="bay-terminal-copy mb-2 block text-xs text-[#d7ffd0]"
      >
        {signupPhase === "username" ? "Create your user name" : "Create your password"}
      </label>
      <div
        onPointerDown={focusInput}
        onAnimationEnd={() => setIsUsernameBlocked(false)}
        className={`flex items-center gap-2 overflow-hidden border border-[#1d7f12] bg-[#001100] px-2 py-2 shadow-[inset_0_0_12px_rgba(57,255,20,0.14)] ${
          isUsernameBlocked ? "animate-[option-shake_180ms_linear]" : ""
        }`}
      >
        <span
          className="bay-terminal-field text-xl leading-none text-[#39ff14]"
          aria-hidden="true"
        >
          C&gt;
        </span>
        <div
          key={signupPhase}
          className="relative min-h-9 flex-1 animate-[signup-field-swipe_240ms_ease-out]"
        >
          {signupPhase === "username" ? (
            <div
              className="bay-terminal-field pointer-events-none absolute inset-0 flex items-center text-base leading-6 text-[#39ff14] [text-shadow:0_0_8px_#39ff14]"
              aria-hidden="true"
            >
              <span>{username}</span>
              <span className="ml-1 h-5 w-3 animate-pulse bg-[#39ff14] shadow-[0_0_10px_#39ff14]" />
            </div>
          ) : null}
          <input
            ref={inputRef}
            id="circle-username"
            autoComplete={signupPhase === "username" ? "username" : "new-password"}
            autoCapitalize="none"
            inputMode="text"
            maxLength={30}
            spellCheck={false}
            type={signupPhase === "username" ? "text" : "password"}
            value={signupPhase === "username" ? username : password}
            onChange={(event) => {
              if (signupPhase === "username") {
                setUsername(normalizeUsername(event.target.value));
              } else {
                setPassword(event.target.value.slice(0, 24));
              }

              setErrorMessage("");
              setIsUsernameBlocked(false);
            }}
            placeholder={signupPhase === "username" ? "" : "Create a Password"}
            className={`bay-terminal-field absolute inset-0 w-full bg-transparent text-base leading-6 outline-none placeholder:font-normal placeholder:italic placeholder:text-[#1d7f12] ${
              signupPhase === "username"
                ? "text-transparent caret-transparent"
                : "text-[#39ff14] caret-[#39ff14]"
            }`}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bay-terminal-copy mt-3 min-h-11 w-full touch-manipulation border border-[#39ff14] px-3 py-2 text-sm text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        {isSubmitting
          ? signupPhase === "username"
            ? "Activating"
            : "Saving"
          : signupPhase === "username"
            ? "Join the Circle"
            : "Continue"}
      </button>
      {signupPhase === "username" ? (
        <p className="bay-terminal-copy mt-3 border-l border-[#39ff14] pl-3 text-[0.68rem] leading-5 text-[#7f9f78]">
          a-z
          <br />
          0-9
          <br />
          (-)
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSignupPhase("username");
            setPassword("");
            setErrorMessage("");
            focusInput();
          }}
          className="bay-terminal-copy mt-3 text-left text-[0.68rem] text-[#7f9f78] underline decoration-[#1d7f12] underline-offset-4 transition hover:text-[#39ff14]"
        >
          change username
        </button>
      )}
      {errorMessage ? (
        <p className="bay-terminal-copy mt-3 text-[0.68rem] leading-5 text-[#39ff14]">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
