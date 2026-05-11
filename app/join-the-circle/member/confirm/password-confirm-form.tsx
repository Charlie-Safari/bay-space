"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./password-confirm-form.module.css";

type PasswordConfirmFormProps = {
  member: string;
  name: string;
  pin: string;
  refName: string;
  roles: string;
  title: string;
};

const memberCounterKey = "bay-space-circle-next-member-v6";
const activeMemberKey = "bay-space-active-member-v6";

function getMemberKey(memberId: string) {
  return `bay-space-circle-member-v6-${memberId}`;
}

export default function PasswordConfirmForm({
  member,
  name,
  pin,
  refName,
  roles,
  title,
}: PasswordConfirmFormProps) {
  const router = useRouter();
  const [confirmPin, setConfirmPin] = useState("");
  const [isWrongPassword, setIsWrongPassword] = useState(false);

  function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (confirmPin !== pin) {
      setIsWrongPassword(false);
      window.setTimeout(() => setIsWrongPassword(true), 0);
      return;
    }

    window.localStorage.setItem(
      getMemberKey(member),
      JSON.stringify({ member, name, pin, refName, roles, title }),
    );
    const nextMember = Number(
      window.localStorage.getItem(memberCounterKey) ?? "1",
    );
    const currentMember = Number(member);

    if (Number.isFinite(currentMember) && nextMember <= currentMember) {
      window.localStorage.setItem(memberCounterKey, String(currentMember + 1));
    }

    window.localStorage.setItem(activeMemberKey, member);
    window.dispatchEvent(new Event("bay-space-auth"));
    router.push(`/join-the-circle/member/complete?member=${member}`);
  }

  return (
    <form onSubmit={saveMember} className="mt-8 w-full max-w-md">
      <div
        className={isWrongPassword ? styles.alert : ""}
        onAnimationEnd={() => setIsWrongPassword(false)}
      >
        <input
          type="password"
          value={confirmPin}
          onChange={(event) => {
            setConfirmPin(event.target.value.slice(0, 24));
          }}
          className="w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
          autoFocus
        />
      </div>
      {isWrongPassword ? (
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14]">
          try again
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        save
      </button>
    </form>
  );
}
