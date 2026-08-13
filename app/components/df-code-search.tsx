"use client";

import { useRouter } from "next/navigation";
import DosCodeBox from "./dos-code-box";

const dfCodes = ["a4rbs", "shadows"];

export default function DfCodeSearch() {
  const router = useRouter();

  function openCode(nextCode: string) {
    const normalizedCode = nextCode.toLowerCase();

    if (dfCodes.includes(normalizedCode)) {
      router.push(`/facts-on-news?df=${normalizedCode}`);
    }
  }

  return (
    <DosCodeBox
      ariaLabel="Open Facts on News code"
      autoFocus
      id="df-code"
      label="facts on news code"
      maxLength={7}
      onSubmitCode={openCode}
      shouldSubmitCode={(nextCode) => dfCodes.includes(nextCode.toLowerCase())}
    />
  );
}
