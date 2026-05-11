"use client";

import { useEffect, useState } from "react";
import JoinCircleForm from "./join-circle-form";

const activeMemberKey = "bay-space-active-member-v6";

export default function JoinCirclePanel() {
  const [activeMember, setActiveMember] = useState("");

  useEffect(() => {
    function syncActiveMember() {
      setActiveMember(window.localStorage.getItem(activeMemberKey) ?? "");
    }

    syncActiveMember();
    window.addEventListener("storage", syncActiveMember);
    window.addEventListener("bay-space-auth", syncActiveMember);

    return () => {
      window.removeEventListener("storage", syncActiveMember);
      window.removeEventListener("bay-space-auth", syncActiveMember);
    };
  }, []);

  if (activeMember) {
    return (
      <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base font-black uppercase leading-7 tracking-[0.16em] text-[#d7ffd0] sm:text-lg">
        you are already logged in
      </p>
    );
  }

  return (
    <>
      <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
        no email required - remember your pin
      </p>
      <JoinCircleForm />
    </>
  );
}
