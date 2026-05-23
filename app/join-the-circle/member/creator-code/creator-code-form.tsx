"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CreatorCodeFormProps = {
  mode: "admin" | "bayo" | "bayo-plus";
  reportHref: string;
};

const bayoGateBinary =
  "01101111 01110111 01101100 01100110 01100101 01100001 01110100 01101000 01100101 01110010";

const bayoPlusGateBinary =
  "01100011 01110010 01111001 01110000 01110100 00100000 01101011 01100101 01100101 01110000 01100101 01110010";

const bayoGatePhrase = "OWLFEATHER";
const bayoPlusGatePhrase = "CRYPTKEEPER";
const bayoPlusGatePhraseWithSpace = "CRYPT KEEPER";
const bayoGatePrompt = "e.n.t.e.r. g.a.t.e.k.e.y. 🦉";

export default function CreatorCodeForm({
  mode,
  reportHref,
}: CreatorCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const isBayoGate = mode === "bayo" || mode === "bayo-plus";
  const expectedBayoGate = mode === "bayo-plus" ? bayoPlusGateBinary : bayoGateBinary;
  const [typedPrompt, setTypedPrompt] = useState(
    mode === "bayo" ? "" : "enter code",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    if (!isBayoGate) {
      return;
    }

    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setTypedPrompt(bayoGatePrompt.slice(0, index));

      if (index >= bayoGatePrompt.length) {
        window.clearInterval(interval);
      }
    }, 75);

    return () => {
      window.clearInterval(interval);
    };
  }, [isBayoGate]);

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim();
    const compactCode = normalizedCode.replace(/\s+/g, "").toLowerCase();
    const exactCode = normalizedCode.toLowerCase();

    if (!isBayoGate && compactCode === "admin1") {
      router.push(reportHref);
      return;
    }

    if (
      isBayoGate &&
      (normalizedCode === expectedBayoGate ||
        compactCode === expectedBayoGate.replace(/\s+/g, "") ||
        (mode === "bayo" && compactCode === bayoGatePhrase.toLowerCase()) ||
        (mode === "bayo-plus" &&
          (compactCode === bayoPlusGatePhrase.toLowerCase() ||
            exactCode === bayoPlusGatePhraseWithSpace.toLowerCase())))
    ) {
      router.push(reportHref);
      return;
    }

    setErrorMessage(isBayoGate ? "gatekey not recognized" : "code not recognized");
  }

  return (
    <form
      onSubmit={verify}
      className="mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]"
    >
      <label
        htmlFor="creator-code"
        className="mb-3 block text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]"
      >
        {typedPrompt}
        {isBayoGate ? (
          <span
            className="ml-2 inline-block h-4 w-3 translate-y-0.5 bg-[#39ff14] align-baseline shadow-[0_0_10px_rgba(57,255,20,0.75)]"
            aria-hidden="true"
          />
        ) : null}
      </label>
      <input
        ref={inputRef}
        id="creator-code"
        value={code}
        onChange={(event) => {
          setErrorMessage("");
          setCode(
            isBayoGate
              ? event.target.value
                  .replace(/[^a-z0-9\s]/gi, "")
                  .slice(0, expectedBayoGate.length)
              : event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 12),
          );
        }}
        className="w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
      />
      {errorMessage ? (
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14]">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        next
      </button>
    </form>
  );
}
