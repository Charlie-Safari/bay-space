"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CreatorCodeFormProps = {
  reportHref: string;
};

export default function CreatorCodeForm({ reportHref }: CreatorCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (code.toLowerCase() === "admin1") {
      router.push(reportHref);
    }
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
        enter code
      </label>
      <input
        id="creator-code"
        value={code}
        onChange={(event) =>
          setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 12))
        }
        className="w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
        autoFocus
      />
      <button
        type="submit"
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        next
      </button>
    </form>
  );
}
