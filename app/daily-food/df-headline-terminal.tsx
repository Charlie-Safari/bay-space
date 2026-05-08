"use client";

import { useEffect, useState } from "react";
import DosCodeBox from "../components/dos-code-box";

const unlockCode = "c4bar";
const headlines = [
  {
    text: "Construction Workers Long Aware of Hantavirus as Four Corners Strain Became Known as Sin Nombre",
    timestamp: "5/7 9:47 MTN",
    icons: "🚧 🦠",
  },
  {
    text: "Alien files being released tomorrow 8 AM Eastern standard time",
    timestamp: "5/7 9:14 MTN",
    icons: "👽 🗂️",
  },
];

type DfHeadlineTerminalProps = {
  initiallyActive: boolean;
};

function TypedHeadline({ text }: { text: string }) {
  const [visibleCharacters, setVisibleCharacters] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisibleCharacters((currentCount) =>
        currentCount >= text.length ? currentCount : currentCount + 2,
      );
    }, 14);

    return () => {
      window.clearInterval(timer);
    };
  }, [text]);

  return <>{text.slice(0, visibleCharacters)}</>;
}

export default function DfHeadlineTerminal({
  initiallyActive,
}: DfHeadlineTerminalProps) {
  const [isActive, setIsActive] = useState(initiallyActive);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const activeHeadline = headlines[headlineIndex];

  function showPreviousHeadline() {
    setHeadlineIndex((currentIndex) =>
      currentIndex === 0 ? headlines.length - 1 : currentIndex - 1,
    );
  }

  function showNextHeadline() {
    setHeadlineIndex((currentIndex) =>
      currentIndex === headlines.length - 1 ? 0 : currentIndex + 1,
    );
  }

  function activateCode(nextCode: string) {
    if (nextCode.toLowerCase() === unlockCode) {
      setIsActive(true);
    }
  }

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setHeadlineIndex((currentIndex) =>
        currentIndex === headlines.length - 1 ? 0 : currentIndex + 1,
      );
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isActive]);

  return (
    <div className="w-full max-w-5xl">
      <div className="relative flex min-h-40 w-full items-center overflow-hidden border-2 border-[#39ff14] bg-black py-10 shadow-[0_0_24px_rgba(57,255,20,0.24)] sm:min-h-48">
        {isActive ? (
          <>
            <div className="absolute right-3 top-2 z-10 text-xs font-bold uppercase tracking-[0.14em] text-[#9aa09a]/55">
              [{activeHeadline.timestamp}]
            </div>
            <div className="absolute right-3 top-8 z-10 flex items-center gap-2 bg-black/70 px-2 py-1 text-lg text-[#d7ffd0]">
              <button
                type="button"
                onClick={showPreviousHeadline}
                className="px-1 text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                aria-label="Previous headline"
              >
                &lt;
              </button>
              <span aria-label="Headline subject">{activeHeadline.icons}</span>
              <button
                type="button"
                onClick={showNextHeadline}
                className="px-1 text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                aria-label="Next headline"
              >
                &gt;
              </button>
            </div>
            <div className="max-w-4xl px-5 pr-32 text-2xl font-black uppercase leading-snug tracking-[0.08em] text-[#39ff14] [text-shadow:0_0_14px_#39ff14] sm:text-4xl">
              <TypedHeadline
                key={`${headlineIndex}-${activeHeadline.text}`}
                text={activeHeadline.text}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-8">
        <DosCodeBox
          ariaLabel="Activate Daily Food headline"
          autoFocus
          id="daily-food-code"
          label="DF code"
          maxLength={5}
          onSubmitCode={activateCode}
        />
      </div>
    </div>
  );
}
