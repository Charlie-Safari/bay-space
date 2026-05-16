"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PinSetupFormProps = {
  initialRef: string;
  member: string;
  name: string;
  roles: string;
  title: string;
};

export default function PinSetupForm({
  initialRef,
  member,
  name,
  roles,
  title,
}: PinSetupFormProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const refName = initialRef || name;

  async function saveIntel() {
    if (!pin.trim()) {
      return;
    }

    setErrorMessage("");
    const response = await fetch("/api/signup-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        member,
        name,
        pin,
        refName,
        roles,
        title,
      }),
    });
    const data = (await response.json()) as {
      message?: string;
      nextPath?: string;
    };

    if (!response.ok || !data.nextPath) {
      setErrorMessage(data.message ?? "save failed");
      return;
    }

    setPin("");
    router.push(data.nextPath);
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
        Reference name:
        <input
          value={refName}
          readOnly
          className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none placeholder:text-[#1d7f12] focus:ring-2 focus:ring-[#39ff14]"
        />
      </label>
      <button
        type="button"
        onClick={saveIntel}
        className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        save
      </button>
      {errorMessage ? (
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#39ff14]">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
