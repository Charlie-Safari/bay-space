"use client";

import { useRouter } from "next/navigation";
import DosCodeBox from "./dos-code-box";

export default function NewsCodeSearch() {
  const router = useRouter();

  function openNewsCode(nextCode: string) {
    router.push(`/news?news=${encodeURIComponent(nextCode.toLowerCase())}`);
  }

  return (
    <DosCodeBox
      ariaLabel="Open top story code"
      id="home-news-code"
      label="TS code"
      maxLength={7}
      onSubmitCode={openNewsCode}
    />
  );
}
