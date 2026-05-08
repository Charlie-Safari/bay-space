"use client";

import { useRouter } from "next/navigation";
import DosCodeBox from "./dos-code-box";

const libraryCodes: Record<string, string> = {
  "000": "/library/intro-000",
  "001": "/library/001",
  "5626": "/library/5626",
  "999": "/library/999",
  safari1: "/library/admin-index",
};

export default function LibraryCodeSearch() {
  const router = useRouter();

  function openCode(nextCode: string) {
    const href = libraryCodes[nextCode.toLowerCase()];

    if (href) {
      router.push(href);
    }
  }

  return (
    <DosCodeBox
      ariaLabel="Open library code"
      autoFocus
      id="library-code"
      label="library code"
      maxLength={11}
      onSubmitCode={openCode}
      shouldSubmitCode={(nextCode) => nextCode.toLowerCase() in libraryCodes}
    />
  );
}
