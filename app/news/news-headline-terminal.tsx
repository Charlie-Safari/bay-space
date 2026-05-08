"use client";

import { useState } from "react";
import DosCodeBox from "../components/dos-code-box";
import styles from "./page.module.css";

const unlockCode = "c4bar";
const headline = ":top story: Alien files released tomorrow morning";

type NewsHeadlineTerminalProps = {
  initialCode: string;
};

export default function NewsHeadlineTerminal({
  initialCode,
}: NewsHeadlineTerminalProps) {
  const [isActive, setIsActive] = useState(
    initialCode.toLowerCase() === unlockCode,
  );

  function activateCode(nextCode: string) {
    if (nextCode.toLowerCase() === unlockCode) {
      setIsActive(true);
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-8 flex min-h-32 w-full items-center overflow-hidden border-2 border-[#39ff14] bg-black py-8 shadow-[0_0_24px_rgba(57,255,20,0.24)]">
        {isActive ? (
          <div
            className={`${styles.headlineTrack} w-max whitespace-nowrap text-2xl font-black uppercase tracking-[0.12em] text-[#39ff14] [text-shadow:0_0_14px_#39ff14] sm:text-4xl`}
          >
            <span>{headline}</span>
            <span aria-hidden="true">{headline}</span>
            <span aria-hidden="true">{headline}</span>
            <span aria-hidden="true">{headline}</span>
          </div>
        ) : null}
      </div>

      <DosCodeBox
        ariaLabel="Enter news code"
        autoFocus
        id="news-code"
        label="news code"
        maxLength={5}
        onSubmitCode={activateCode}
      />
    </div>
  );
}
