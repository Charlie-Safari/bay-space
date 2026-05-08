"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

const libraryCodes: Record<string, string> = {
  "000": "/library/intro-000",
  "001": "/library/001",
  "999": "/library/999",
};

export default function LibraryCodeSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("awaiting numeric signal");

  useEffect(() => {
    inputRef.current?.focus();

    function focusFromPageClick(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element) || target.closest("nav")) {
        return;
      }

      inputRef.current?.focus();
    }

    document.addEventListener("pointerdown", focusFromPageClick);

    return () => {
      document.removeEventListener("pointerdown", focusFromPageClick);
    };
  }, []);

  function openCode(nextCode: string) {
    const href = libraryCodes[nextCode];

    if (href) {
      setMessage(`opening library sector ${nextCode}`);
      router.push(href);
      return;
    }

    if (nextCode.length === 3) {
      setMessage(`no signal found for ${nextCode}`);
    } else {
      setMessage("awaiting numeric signal");
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextCode = event.target.value.replace(/\D/g, "").slice(0, 3);

    setCode(nextCode);
    openCode(nextCode);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openCode(code.padStart(3, "0"));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-12 w-full max-w-sm border-2 border-[#39ff14] bg-black p-3 font-[Courier_New,Courier,monospace] shadow-[0_0_18px_rgba(57,255,20,0.18)]"
      aria-label="Open library code"
    >
      <label
        htmlFor="library-code"
        className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[#d7ffd0]"
      >
        library code
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
            className="pointer-events-none absolute inset-0 flex items-center text-3xl font-black leading-none tracking-[0.24em] text-[#39ff14] [text-shadow:0_0_10px_#39ff14]"
            aria-hidden="true"
          >
            <span>{code}</span>
            <span className="ml-1 h-8 w-5 animate-pulse bg-[#39ff14] shadow-[0_0_10px_#39ff14]" />
          </div>
          <input
            ref={inputRef}
            id="library-code"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={3}
            value={code}
            onChange={handleChange}
            className="absolute inset-0 w-full bg-transparent text-3xl font-black leading-none tracking-[0.24em] text-transparent caret-transparent outline-none"
            aria-describedby="library-code-status"
          />
        </div>
      </div>
      <p
        id="library-code-status"
        className="mt-3 min-h-4 text-xs uppercase tracking-[0.18em] text-[#d7ffd0]"
      >
        {message}
      </p>
    </form>
  );
}
