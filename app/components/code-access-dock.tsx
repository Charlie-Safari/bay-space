"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type CodeAccessDockProps = {
  children: (mode: "rc" | "classified") => ReactNode;
  muted?: boolean;
};

export default function CodeAccessDock({
  children,
  muted = false,
}: CodeAccessDockProps) {
  const [activeMode, setActiveMode] = useState<"rc" | "classified" | null>(
    null,
  );

  return (
    <div className="fixed bottom-4 left-4 z-20 w-[min(calc(100vw-2rem),24rem)]">
      <div
        className={`w-fit border-2 bg-black p-2 ${
          muted
            ? "border-[#72c16a] shadow-[0_0_14px_rgba(114,193,106,0.16)]"
            : "border-[#39ff14] shadow-[0_0_18px_rgba(57,255,20,0.2)]"
        }`}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveMode((currentMode) =>
                currentMode === "rc" ? null : "rc",
              )
            }
            className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 ${
              activeMode === "rc"
                ? muted
                  ? "border-[#72c16a] bg-[#72c16a] text-black focus:ring-[#bfd0bc]"
                  : "border-[#39ff14] bg-[#39ff14] text-black focus:ring-[#d7ffd0]"
                : muted
                  ? "border-[#356f31] text-[#72c16a] hover:border-[#6ca365] hover:bg-[#172b15] focus:ring-[#bfd0bc]"
                  : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:ring-[#d7ffd0]"
            }`}
          >
            RC
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveMode((currentMode) =>
                currentMode === "classified" ? null : "classified",
              )
            }
            className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 ${
              activeMode === "classified"
                ? muted
                  ? "border-[#72c16a] bg-[#72c16a] text-black focus:ring-[#bfd0bc]"
                  : "border-[#39ff14] bg-[#39ff14] text-black focus:ring-[#d7ffd0]"
                : muted
                  ? "border-[#356f31] text-[#72c16a] hover:border-[#6ca365] hover:bg-[#172b15] focus:ring-[#bfd0bc]"
                  : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:ring-[#d7ffd0]"
            }`}
          >
            Classified
          </button>
        </div>
      </div>
      {activeMode ? <div className="mt-3">{children(activeMode)}</div> : null}
    </div>
  );
}
