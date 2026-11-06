"use client";

import { useState } from "react";

export const blackLightUrl =
  "https://chatgpt.com/g/g-6a0c0390b6b08191991a65f1b3753fe7-lazy-assistant";

export default function BlackLightLink({ articlePath }: { articlePath: string }) {
  const [message, setMessage] = useState("");

  async function copyArticleLink() {
    try {
      await navigator.clipboard.writeText(new URL(articlePath, window.location.origin).href);
      setMessage("Article link copied. Paste it into Black Light to ask about this article.");
    } catch {
      setMessage("Open Black Light, then paste this article's link to give it context.");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={blackLightUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void copyArticleLink()}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#72c16a]/40 bg-[#72c16a]/10 px-3 py-2 text-sm font-bold text-[#cde0ca] transition hover:border-[#90d587] hover:bg-[#72c16a]/20 focus:outline-none focus:ring-2 focus:ring-[#90d587]"
        aria-label="Open this article in Black Light"
        title="Open Black Light and copy this article's link"
      >
        <span aria-hidden="true">🔦</span>
      </a>
      {message ? <span className="text-xs text-[#9abc96]" role="status">{message}</span> : null}
    </span>
  );
}
