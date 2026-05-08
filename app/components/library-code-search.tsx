"use client";

import { useRouter } from "next/navigation";
import DosCodeBox from "./dos-code-box";

const libraryCodes: Record<string, string> = {
  "000": "/library/intro-000",
  "001": "/library/001",
  "999": "/library/999",
};

export default function LibraryCodeSearch() {
  const router = useRouter();

  function openCode(nextCode: string) {
    const href = libraryCodes[nextCode];

    if (href) {
      router.push(href);
    }
  }

  return (
    <DosCodeBox
      ariaLabel="Open library code"
      id="library-code"
      inputMode="numeric"
      label="library code"
      maxLength={3}
      onSubmitCode={openCode}
    />
  );
}
