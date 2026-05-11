"use client";

import { TouchEvent, useEffect, useState } from "react";
import DosCodeBox from "../components/dos-code-box";

const headlineChannels = {
  shadows: [
    {
      text: "Friday May 8th - UAP disclosure",
      timestamp: "5/8 MTN",
      icons: "🛸",
    },
  ],
  a4rbs: [
    {
      text: "Latest Update Cycle Ends By Framing The CIA Science And Technology Network As A Central Mystery Behind UFO Narratives, Classified Programs, MH370 Speculation, And Advanced Surveillance Power",
      timestamp: "5/7 11:00 PM MTN",
      icons: "🛰️ 🗂️",
    },
    {
      text: "Alleged Orb Technology Framed As National Security Asset Hidden Behind UFO And Alien Narratives",
      timestamp: "5/7 8:40 PM MTN",
      icons: "🛸 🛡️",
    },
    {
      text: "Rubio Alleged To Have Stopped Publicly Discussing UFO Threats After Learning About U.S. Orb Technology",
      timestamp: "5/7 5:15 PM MTN",
      icons: "🛸 🤐",
    },
    {
      text: "Marco Rubio's Earlier UFO Concerns Resurface After Senior National Security Roles",
      timestamp: "5/7 3:00 PM MTN",
      icons: "🛸 🏛️",
    },
    {
      text: "Donald Trump Alleged To Know About Secret U.S. Technology",
      timestamp: "5/7 1:20 PM MTN",
      icons: "🇺🇸 🔒",
    },
    {
      text: "Intelligence Restructuring Framed As Possible Internal Battle Over Classified Technology And Disclosure",
      timestamp: "5/7 11:45 AM MTN",
      icons: "🧠 ⚔️",
    },
    {
      text: "@AshtonForbes - x Dr. Steven Greer says he has an NSA scientist source that claims the MH370 videos are real and it's an Einstein Rosen bridge, also known as a wormhole.",
      timestamp: "5/7 11:08 MTN",
      icons: "✈️ 🌀",
    },
    {
      text: "In-Q-Tel, Palantir, Google Earth, And Advanced Surveillance Technology Connected To The CIA Science And Technology Sphere",
      timestamp: "5/7 10:00 AM MTN",
      icons: "🛰️ 👁️",
    },
    {
      text: "Tulsi Gabbard's Reported Plan To Move CIA-Backed In-Q-Tel Oversight Away From The CIA Cited As Key Development",
      timestamp: "5/7 8:30 AM MTN",
      icons: "🏛️ 🔁",
    },
    {
      text: "Calls Grow For More Scrutiny Of The CIA Directorate Of Science And Technology",
      timestamp: "5/6 8:25 PM MTN",
      icons: "🔎 🏛️",
    },
    {
      text: "Black Programs Alleged To Be Legally Classified And Difficult To Challenge Through Public Oversight",
      timestamp: "5/6 7:00 PM MTN",
      icons: "⬛ ⚖️",
    },
    {
      text: "Castle Bravo, Implosion Theory, Quantum Entanglement, And Alleged Space-Time Manipulation Research Linked Together",
      timestamp: "5/6 5:35 PM MTN",
      icons: "💥 🌀",
    },
    {
      text: "Classified Technology Programs Alleged To Influence Which Private Companies Succeed",
      timestamp: "5/6 4:10 PM MTN",
      icons: "🏢 🔒",
    },
    {
      text: "CIA Secret Science Programs Framed As Front Page News",
      timestamp: "5/6 2:45 PM MTN",
      icons: "📰 🧪",
    },
    {
      text: "Alleged MH370 Operation Said To Involve A Device, Two Drones, Plasma Orbs, And Classified CIA Planning",
      timestamp: "5/6 1:30 PM MTN",
      icons: "✈️ 🛸",
    },
    {
      text: "Alleged Plasma Orb Technology Linked To Covert Intelligence Operations And The MH370 Disappearance Theory",
      timestamp: "5/6 12:05 PM MTN",
      icons: "🟢 ✈️",
    },
    {
      text: "CIA Science And Technology Directorate Alleged To Control Advanced Physics, Plasma Technology, Quantum Research, Vacuum Engineering, And Exotic Propulsion Programs",
      timestamp: "5/6 10:40 AM MTN",
      icons: "🧪 🚀",
    },
    {
      text: "CIA Presidential Findings Alleged To Provide Legal Cover For Classified Covert Operations",
      timestamp: "5/6 9:15 AM MTN",
      icons: "📜 🕶️",
    },
    {
      text: "CIA Science And Technology Directorate Alleged To Be Central To Secret Exotic Physics And Plasma Orb Technology",
      timestamp: "5/6 8:00 AM MTN",
      icons: "🧪 🟢",
    },
  ],
};

type HeadlineCode = keyof typeof headlineChannels;

type DfHeadlineTerminalProps = {
  initialCode: string;
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

function getStoryIcon(icons: string) {
  return icons.split(" ")[0];
}

export default function DfHeadlineTerminal({
  initialCode,
}: DfHeadlineTerminalProps) {
  const initialHeadlineCode = initialCode.toLowerCase() as HeadlineCode;
  const [activeCode, setActiveCode] = useState<HeadlineCode | null>(
    initialHeadlineCode in headlineChannels ? initialHeadlineCode : null,
  );
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const activeHeadlines = activeCode ? headlineChannels[activeCode] : [];
  const activeHeadline = activeHeadlines[headlineIndex];
  const previousHeadline =
    activeHeadlines[
      headlineIndex === 0 ? activeHeadlines.length - 1 : headlineIndex - 1
    ];
  const nextHeadline =
    activeHeadlines[
      headlineIndex === activeHeadlines.length - 1 ? 0 : headlineIndex + 1
    ];
  const previousIcon = previousHeadline ? getStoryIcon(previousHeadline.icons) : "";
  const activeIcon = getStoryIcon(activeHeadline?.icons ?? "");
  const nextIcon = nextHeadline ? getStoryIcon(nextHeadline.icons) : "";

  function showPreviousHeadline() {
    setHeadlineIndex((currentIndex) =>
      currentIndex === 0 ? activeHeadlines.length - 1 : currentIndex - 1,
    );
  }

  function showNextHeadline() {
    setHeadlineIndex((currentIndex) =>
      currentIndex === activeHeadlines.length - 1 ? 0 : currentIndex + 1,
    );
  }

  function activateCode(nextCode: string) {
    const normalizedCode = nextCode.toLowerCase() as HeadlineCode;

    if (normalizedCode in headlineChannels) {
      setActiveCode(normalizedCode);
      setHeadlineIndex(0);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];

    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touchStart || activeHeadlines.length < 2) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

    setTouchStart(null);

    if (!isHorizontalSwipe) {
      return;
    }

    if (deltaX < 0) {
      showNextHeadline();
    } else {
      showPreviousHeadline();
    }
  }

  useEffect(() => {
    if (!activeCode) {
      return;
    }

    const timer = window.setInterval(() => {
      setHeadlineIndex((currentIndex) =>
        currentIndex === headlineChannels[activeCode].length - 1
          ? 0
          : currentIndex + 1,
      );
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeCode]);

  return (
    <div className="w-full max-w-5xl">
      {activeHeadline ? (
        <div
          className="relative flex min-h-40 w-full touch-pan-y flex-col gap-6 overflow-hidden border-2 border-[#39ff14] bg-black px-5 py-8 shadow-[0_0_24px_rgba(57,255,20,0.24)] sm:min-h-48 sm:px-6 sm:py-10"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
            <div className="flex w-full flex-col gap-3">
              <div className="self-end text-sm font-bold uppercase tracking-[0.14em] text-[#9aa09a]/55 sm:text-base">
                [{activeHeadline.timestamp}]
              </div>
              <div className="flex w-full items-center justify-between gap-4 text-[#d7ffd0]">
                <button
                  type="button"
                  onClick={showPreviousHeadline}
                  className="flex items-center gap-3 bg-black/70 px-2 py-1 text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  aria-label="Previous headline"
                >
                  <span className="text-5xl leading-none sm:text-6xl" aria-hidden="true">
                    &lt;
                  </span>
                  <span className="text-xl leading-none sm:text-2xl" aria-hidden="true">
                    {previousIcon}
                  </span>
                </button>
                <span
                  aria-label="Current headline subject"
                  className="bg-black/70 px-3 py-1 text-xl leading-none sm:text-2xl"
                >
                  {activeIcon}
                </span>
                <button
                  type="button"
                  onClick={showNextHeadline}
                  className="flex items-center gap-3 bg-black/70 px-2 py-1 text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  aria-label="Next headline"
                >
                  <span className="text-xl leading-none sm:text-2xl" aria-hidden="true">
                    {nextIcon}
                  </span>
                  <span className="text-5xl leading-none sm:text-6xl" aria-hidden="true">
                    &gt;
                  </span>
                </button>
              </div>
            </div>
            <div className="max-w-4xl text-2xl font-black uppercase leading-snug tracking-[0.08em] text-[#39ff14] [text-shadow:0_0_14px_#39ff14] sm:text-4xl">
              <TypedHeadline
                key={`${headlineIndex}-${activeHeadline.text}`}
                text={activeHeadline.text}
              />
            </div>
        </div>
      ) : null}

      <div className={activeHeadline ? "mt-8" : ""}>
        <DosCodeBox
          ariaLabel="Activate Daily Food headline"
          autoFocus
          id="daily-food-code"
          label="DF code"
          maxLength={7}
          onSubmitCode={activateCode}
          shouldSubmitCode={(nextCode) =>
            nextCode.toLowerCase() in headlineChannels
          }
        />
      </div>
    </div>
  );
}
