"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type DosCodeBoxProps = {
  ariaLabel: string;
  id: string;
  label: string;
  maxLength: number;
  message?: string;
  muted?: boolean;
  autoFocus?: boolean;
  inputMode?: "numeric" | "text";
  onSubmitCode: (code: string) => void;
  shouldSubmitCode?: (code: string) => boolean;
};

export default function DosCodeBox({
  ariaLabel,
  id,
  label,
  maxLength,
  message,
  muted = false,
  autoFocus = false,
  inputMode = "text",
  onSubmitCode,
  shouldSubmitCode,
}: DosCodeBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  function normalizeCode(value: string) {
    const pattern = inputMode === "numeric" ? /\D/g : /[^a-z0-9]/gi;

    return value.replace(pattern, "").slice(0, maxLength);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextCode = normalizeCode(event.target.value);

    setCode(nextCode);

    if (nextCode.length === maxLength || shouldSubmitCode?.(nextCode)) {
      onSubmitCode(nextCode);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitCode(inputMode === "numeric" ? code.padStart(maxLength, "0") : code);
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPointerDown={() => inputRef.current?.focus()}
      className={`w-full max-w-sm border-2 bg-black p-3 font-[Courier_New,Courier,monospace] ${
        muted
          ? "border-[#72c16a] shadow-[0_0_14px_rgba(114,193,106,0.14)]"
          : "border-[#39ff14] shadow-[0_0_18px_rgba(57,255,20,0.18)]"
      }`}
      aria-label={ariaLabel}
    >
      <label
        htmlFor={id}
        className={`mb-2 block text-xs font-bold uppercase tracking-[0.24em] ${muted ? "text-[#bfd0bc]" : "text-[#d7ffd0]"}`}
      >
        {label}
      </label>
      <div
        className={`flex items-center gap-2 border bg-[#001100] px-2 py-2 ${
          muted
            ? "border-[#356f31] shadow-[inset_0_0_10px_rgba(114,193,106,0.12)]"
            : "border-[#1d7f12] shadow-[inset_0_0_12px_rgba(57,255,20,0.14)]"
        }`}
      >
        <span
          className={`text-3xl font-black leading-none ${muted ? "text-[#72c16a]" : "text-[#39ff14]"}`}
          aria-hidden="true"
        >
          C&gt;
        </span>
        <div className="relative min-h-9 flex-1">
          <div
            className={`pointer-events-none absolute inset-0 flex items-center text-3xl font-black leading-none tracking-[0.18em] ${
              muted
                ? "text-[#72c16a] [text-shadow:0_0_8px_rgba(114,193,106,0.35)]"
                : "text-[#39ff14] [text-shadow:0_0_10px_#39ff14]"
            }`}
            aria-hidden="true"
          >
            <span>{code}</span>
            <span
              className={`ml-1 h-8 w-5 animate-pulse ${
                muted
                  ? "bg-[#72c16a] shadow-[0_0_8px_rgba(114,193,106,0.35)]"
                  : "bg-[#39ff14] shadow-[0_0_10px_#39ff14]"
              }`}
            />
          </div>
          <input
            ref={inputRef}
            id={id}
            inputMode={inputMode}
            pattern={inputMode === "numeric" ? "[0-9]*" : "[a-zA-Z0-9]*"}
            autoComplete="off"
            maxLength={maxLength}
            value={code}
            onChange={handleChange}
            className="absolute inset-0 w-full bg-transparent text-3xl font-black leading-none tracking-[0.18em] text-transparent caret-transparent outline-none"
          />
        </div>
      </div>
      {message ? (
        <p className={`mt-3 min-h-4 text-xs uppercase tracking-[0.18em] ${muted ? "text-[#bfd0bc]" : "text-[#d7ffd0]"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
