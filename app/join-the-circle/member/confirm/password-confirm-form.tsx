"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./password-confirm-form.module.css";

type PasswordConfirmFormProps = {
  member: string;
  name: string;
  refName: string;
  roles: string;
  title: string;
};

export default function PasswordConfirmForm({
  member,
  name,
  refName,
  roles,
  title,
}: PasswordConfirmFormProps) {
  const router = useRouter();
  const [confirmPin, setConfirmPin] = useState("");
  const [isWrongPassword, setIsWrongPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function flashError(message: string) {
    setErrorMessage("");
    setIsWrongPassword(false);
    window.setTimeout(() => {
      setErrorMessage(message);
      setIsWrongPassword(true);
    }, 0);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!confirmPin || isSaving) {
      flashError("try again");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/members/${member}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmPin, name, refName, roles, title }),
      });
      const data = (await response.json()) as {
        member?: {
          member: string;
          name: string;
          refName: string;
          roles: string;
          title: string;
        };
        message?: string;
      };
      setIsSaving(false);

      if (!response.ok || !data.member) {
        flashError(data.message ?? "save failed");
        return;
      }

      const savedMemberId = data.member.member;
      window.dispatchEvent(new Event("bay-space-auth"));
      router.push(`/join-the-circle/member/complete?member=${savedMemberId}`);
    } catch {
      setIsSaving(false);
      flashError("save failed");
    }
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
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSaving}
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        {isSaving ? "saving" : "save"}
      </button>
    </form>
  );
}
