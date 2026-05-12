"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type CodeAccessDockProps = {
  children: (mode: "rc" | "classified") => ReactNode;
};

export default function CodeAccessDock({ children }: CodeAccessDockProps) {
  const [activeMode, setActiveMode] = useState<"rc" | "classified" | null>(
    null,
  );

  return (
    <div className="fixed bottom-4 left-4 z-20 w-[min(calc(100vw-2rem),24rem)]">
      <div className="w-fit border-2 border-[#39ff14] bg-black p-2 shadow-[0_0_18px_rgba(57,255,20,0.2)]">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveMode((currentMode) =>
                currentMode === "rc" ? null : "rc",
              )
            }
            className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
              activeMode === "rc"
                ? "border-[#39ff14] bg-[#39ff14] text-black"
                : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
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
            className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
              activeMode === "classified"
                ? "border-[#39ff14] bg-[#39ff14] text-black"
                : "border-[#1d7f12] text-[#39ff14] hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
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
