"use client";

import { useRouter } from "next/navigation";
import DosCodeBox from "./dos-code-box";

const dfCode = "c4bar";

export default function DfCodeSearch() {
  const router = useRouter();

  function openCode(nextCode: string) {
    if (nextCode.toLowerCase() === dfCode) {
      router.push("/daily-food?df=c4bar");
    }
  }

  return (
    <DosCodeBox
      ariaLabel="Open Daily Food code"
      autoFocus
      id="df-code"
      label="daily food code"
      maxLength={5}
      onSubmitCode={openCode}
    />
  );
}
