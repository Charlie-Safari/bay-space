"use client";

import { useEffect, useState } from "react";
import JoinCircleForm from "./join-circle-form";

export default function JoinCirclePanel() {
  const [activeMember, setActiveMember] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function syncActiveMember() {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = response.ok
        ? ((await response.json()) as { member?: { member: string } | null })
        : { member: null };

      if (isMounted) {
        setActiveMember(data.member?.member ?? "");
      }
    }

    syncActiveMember();
    window.addEventListener("storage", syncActiveMember);
    window.addEventListener("bay-space-auth", syncActiveMember);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncActiveMember);
      window.removeEventListener("bay-space-auth", syncActiveMember);
    };
  }, []);

  if (activeMember) {
    return (
      <p className="bay-terminal-copy mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-sm leading-7 text-[#d7ffd0] sm:text-base">
        you are already logged in
      </p>
    );
  }

  return (
    <>
      <p className="bay-terminal-copy mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-sm leading-7 text-[#d7ffd0] sm:text-base">
        no email required - remember your password
      </p>
      <JoinCircleForm />
    </>
  );
}
