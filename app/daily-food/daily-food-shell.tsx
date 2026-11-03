"use client";
import { useState } from "react";
import DfHeadlineTerminal from "./df-headline-terminal";

export default function DailyFoodShell() {
  const [referenceQuery, setReferenceQuery] = useState("");
  const [unlockedReference, setUnlockedReference] = useState("");

  function changeReferenceQuery(value: string) {
    setReferenceQuery(value);
  }

  function unlockReference() {
    setUnlockedReference(referenceQuery);
  }

  function clearReference() {
    setReferenceQuery("");
    setUnlockedReference("");
  }

  return (
    <DfHeadlineTerminal
      key={unlockedReference || "public"}
      onClearReference={clearReference}
      onReferenceQueryChange={changeReferenceQuery}
      onUnlockReference={unlockReference}
      referenceQuery={referenceQuery}
      unlockedReference={unlockedReference}
    />
  );
}
