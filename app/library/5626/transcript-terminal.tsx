"use client";

import { useEffect, useMemo, useState } from "react";

type TranscriptTerminalProps = {
  lines: string[];
};

const maxVisibleLines = 4;
const typingDelayMs = 38;

function chunkTranscript(lines: string[]) {
  const chunks: string[][] = [];

  for (let index = 0; index < lines.length; index += maxVisibleLines) {
    chunks.push(lines.slice(index, index + maxVisibleLines));
  }

  return chunks;
}

export default function TranscriptTerminal({ lines }: TranscriptTerminalProps) {
  const chunks = useMemo(() => chunkTranscript(lines), [lines]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const activeChunk = chunks[chunkIndex] ?? [];
  const activeText = activeChunk.join("\n\n");
  const isTypingComplete = visibleCharacters >= activeText.length;

  function showNextPage() {
    setChunkIndex((currentIndex) =>
      currentIndex === chunks.length - 1 ? 0 : currentIndex + 1,
    );
    setVisibleCharacters(0);
  }

  function showPreviousPage() {
    setChunkIndex((currentIndex) =>
      currentIndex === 0 ? chunks.length - 1 : currentIndex - 1,
    );
    setVisibleCharacters(0);
  }

  function finishOrAdvancePage() {
    if (!isTypingComplete) {
      setVisibleCharacters(activeText.length);
      return;
    }

    showNextPage();
  }

  useEffect(() => {
    if (!activeText) {
      return;
    }

    if (isTypingComplete) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleCharacters((currentCount) =>
        Math.min(currentCount + 1, activeText.length),
      );
    }, typingDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeText, isTypingComplete, visibleCharacters]);

  return (
    <section
      aria-label="Readable transcript"
      className="mt-10 flex h-[64vh] min-h-[480px] overflow-hidden border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_24px_rgba(57,255,20,0.24)] sm:p-6"
    >
      <div className="flex w-full cursor-pointer flex-col border border-[#1d7f12] bg-[#001100] p-4 shadow-[inset_0_0_18px_rgba(57,255,20,0.16)] sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#1d7f12] pb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#d7ffd0]">
          <span>transcript</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={showPreviousPage}
              className="text-3xl leading-none text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              aria-label="Previous transcript page"
            >
              &lt;
            </button>
            <span>{`${chunkIndex + 1}/${chunks.length}`}</span>
            <button
              type="button"
              onClick={showNextPage}
              className="text-3xl leading-none text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              aria-label="Next transcript page"
            >
              &gt;
            </button>
          </div>
        </div>

        <pre
          onClick={finishOrAdvancePage}
          className="min-h-0 flex-1 whitespace-pre-wrap break-words pb-8 font-[Courier_New,Courier,monospace] text-lg font-black uppercase leading-relaxed tracking-[0.08em] text-[#d7ffd0] [text-shadow:0_0_10px_#39ff14] sm:text-2xl"
        >
          {activeText.slice(0, visibleCharacters)}
          <span className="ml-1 inline-block h-6 w-4 animate-pulse bg-[#39ff14] align-[-0.1em] shadow-[0_0_10px_#39ff14]" />
        </pre>
      </div>
    </section>
  );
}
