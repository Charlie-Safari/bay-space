"use client";

import { useState } from "react";
import DosCodeBox from "../components/dos-code-box";
import styles from "./page.module.css";

const headlines = {
  a4rbs:
    ":top story: @AshtonForbes - x Dr. Steven Greer says he has an NSA scientist source that claims the MH370 videos are real and it's an Einstein Rosen bridge, also known as a wormhole.",
  shadows:
    ":top story: UAP reveal day - Hold on to your tin foil hats, dust the shelves in your bunkers, its the day we have all been waiting for.",
};

type HeadlineCode = keyof typeof headlines;

type NewsHeadlineTerminalProps = {
  initialCode: string;
};

export default function NewsHeadlineTerminal({
  initialCode,
}: NewsHeadlineTerminalProps) {
  const initialHeadlineCode = initialCode.toLowerCase() as HeadlineCode;
  const [activeCode, setActiveCode] = useState<HeadlineCode | null>(
    initialHeadlineCode in headlines ? initialHeadlineCode : null,
  );
  const activeHeadline = activeCode ? headlines[activeCode] : "";

  function activateCode(nextCode: string) {
    const normalizedCode = nextCode.toLowerCase() as HeadlineCode;

    if (normalizedCode in headlines) {
      setActiveCode(normalizedCode);
    }
  }

  return (
    <div className="w-full max-w-5xl">
      {activeHeadline ? (
        <div className="mb-8 flex min-h-32 w-full items-center overflow-hidden border-2 border-[#39ff14] bg-black py-8 shadow-[0_0_24px_rgba(57,255,20,0.24)]">
          <div
            className={`${styles.headlineTrack} w-max whitespace-nowrap text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14] [text-shadow:0_0_14px_#39ff14] sm:text-4xl`}
          >
            <span>{activeHeadline}</span>
            <span aria-hidden="true">{activeHeadline}</span>
            <span aria-hidden="true">{activeHeadline}</span>
            <span aria-hidden="true">{activeHeadline}</span>
          </div>
        </div>
      ) : null}

      <DosCodeBox
        ariaLabel="Enter news code"
        autoFocus
        id="news-code"
        label="reference code"
        maxLength={7}
        onSubmitCode={activateCode}
        shouldSubmitCode={(nextCode) => nextCode.toLowerCase() in headlines}
      />
    </div>
  );
}
