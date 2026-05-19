"use client";

import { useState } from "react";
import DfHeadlineTerminal from "./df-headline-terminal";

export default function DailyFoodShell() {
  const [referenceQuery, setReferenceQuery] = useState("");
  const [unlockedReference, setUnlockedReference] = useState("");
  const [shouldBlinkUnlock, setShouldBlinkUnlock] = useState(false);

  function changeReferenceQuery(value: string) {
    setReferenceQuery(value);
    setShouldBlinkUnlock(false);
  }

  function unlockReference() {
    setUnlockedReference(referenceQuery);
    setShouldBlinkUnlock(false);
  }

  function clearReference() {
    setReferenceQuery("");
    setUnlockedReference("");
  }

  return (
    <>
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-5xl font-black uppercase tracking-[0.18em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
          daily food
        </h1>
        <div
          id="daily-food-reference"
          className="flex w-fit flex-wrap items-center gap-3 border-2 border-[#1d7f12] bg-black px-3 py-2 shadow-[0_0_14px_rgba(57,255,20,0.14)]"
        >
          <span className="text-xl" aria-hidden="true">
            🌀
          </span>
          <input
            value={referenceQuery}
            onChange={(event) => changeReferenceQuery(event.target.value)}
            placeholder="article code"
            className="w-52 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.14em] text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
          />
          <button
            type="button"
            onClick={unlockReference}
            className={`border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
              shouldBlinkUnlock ? "animate-pulse" : ""
            }`}
          >
            unlock
          </button>
        </div>
      </div>

      <DfHeadlineTerminal
        key={unlockedReference || "public"}
        onClearReference={clearReference}
        unlockedReference={unlockedReference}
      />
    </>
  );
}
